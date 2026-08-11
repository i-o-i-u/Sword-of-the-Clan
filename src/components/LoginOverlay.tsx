// دخول صاحب المكتبة (§٥-٨).
// في النموذج الأوّلي كان الحساب وهميًّا في المتصفح؛ هنا هو مصادقة Supabase
// حقيقية: أول حسابٍ يُنشأ يَحجز ملكية المكتبة مرةً واحدة، ومن يسجّل بعده
// لا يملك شيئًا لأن سياسة قاعدة البيانات تمنع حجزها مرتين.

import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { claimOwnership, fetchOwnerRecord, ownerExists } from '../lib/api'
import { useLibrary } from '../lib/library'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import { CloseButton, Overlay, cardStyle } from './ui'

const MIN_PASSWORD = 6

export default function LoginOverlay({ onClose }: { onClose: () => void }) {
  const { hasOwnerAccount, refreshRole } = useLibrary()
  const firstRun = !hasOwnerAccount

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useScrollLock()
  useEscapeKey(onClose)

  /**
   * يحجز ملكية المكتبة، ويتسامح مع كونها محجوزةً لهذا الحساب نفسه (كأن تُضغط
   * مرتين). فإن كانت لحسابٍ آخر قيل ذلك صراحةً بدل رسالة قاعدة بيانات غامضة.
   */
  async function takeOwnership(userId: string, displayName: string) {
    try {
      await claimOwnership(userId, displayName)
    } catch (err) {
      // الصفّ موجودٌ لنا أصلًا (كأن تُضغط مرتين) فلا شيء يُفعل
      const record = await fetchOwnerRecord()
      if (record?.user_id === userId) return

      // سياسةُ القراءة تُخفي صفّ غيرنا، فلا يكفي غيابُه للحكم بأن الملكية
      // محجوزة. owner_exists تتجاوز السياسة، وهي وحدها تفصل بين الحالتين.
      if (await ownerExists().catch(() => false)) {
        throw new Error(
          'ملكية المكتبة محجوزةٌ لحسابٍ آخر. ادخل بالحساب الذي حجزها، '
          + 'أو حرِّر الملكية من قاعدة البيانات ثم أعد المحاولة.',
        )
      }
      throw new Error(
        'تعذّر حجز ملكية المكتبة: '
        + (err instanceof Error ? err.message : String(err)),
      )
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (firstRun) {
        if (!name.trim() || !email.trim() || password.length < MIN_PASSWORD) {
          setError(`أكمِل الاسم والبريد وكلمةً لا تقل عن ${MIN_PASSWORD} أحرف.`)
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })

        // جلسةٌ فورًا: التأكيد مُعطَّل، فتُحجز الملكية الآن
        if (!signUpError && data.session) {
          await takeOwnership(data.session.user.id, name.trim())
        } else {
          // لا جلسة: إمّا أن التأكيد مفعَّل، وإمّا أن الحساب مُنشأٌ من قبل.
          // نجرّب الدخول به: فإن نجح فالحساب قائمٌ ومؤكَّد، ولم يبقَ إلا حجز الملكية.
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (retry.data.session) {
            await takeOwnership(retry.data.session.user.id, name.trim())
          } else if (signUpError) {
            setError(signUpError.message)
            return
          } else {
            setNotice(
              'أُنشئ الحساب ولم يُفعَّل بعد. أكّد بريدك من الرسالة المُرسَلة ثم ادخل من هنا، '
              + 'أو عطّل تأكيد البريد من إعدادات المشروع ثم أعد المحاولة.',
            )
            return
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError || !data.session) {
          setError('البريد أو كلمة السر غير صحيحة.')
          return
        }
        // إن كان الحساب أُنشئ ولم تُحجز الملكية بعد فتُحجز الآن
        if (!(await ownerExists())) {
          await takeOwnership(data.session.user.id, name.trim() || 'صاحب المكتبة')
        }
      }
      await refreshRole()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر الدخول.')
    } finally {
      setBusy(false)
    }
  }

  const fieldStyle = {
    padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 14,
  } as const

  const labelStyle = {
    display: 'flex', flexDirection: 'column' as const, gap: 6,
    fontSize: 12.5, color: 'var(--muted)',
  }

  return (
    <Overlay onClose={onClose} zIndex={95}>
      <form
        onSubmit={handleSubmit}
        style={{
          ...cardStyle, width: 420, maxWidth: '94vw', borderRadius: 18,
          boxShadow: '0 30px 70px oklch(0.1 0.01 50 / 0.45)', padding: 26,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 20, fontWeight: 700 }}>
              {firstRun ? 'إنشاء حساب صاحب المكتبة' : 'دخول صاحب المكتبة'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.7 }}>
              {firstRun
                ? 'أنشئ حسابك مرةً واحدة، ثم لا يفتح التعديل إلا به.'
                : 'الدخول يفتح التعديل والإعدادات وما أخفيتَه عن الزوار.'}
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {firstRun && (
            <label style={labelStyle}>
              الاسم
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك كما يظهر في الواجهة"
                style={fieldStyle}
              />
            </label>
          )}

          <label style={labelStyle}>
            البريد
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            كلمة السر
            <input
              type="password"
              dir="ltr"
              autoComplete={firstRun ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={fieldStyle}
            />
          </label>

          {error && (
            <div style={{
              fontSize: 12.5, color: 'oklch(0.5 0.15 28)', background: 'oklch(0.95 0.04 28)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          {notice && (
            <div style={{
              fontSize: 12.5, color: 'var(--accent-soft)', background: 'var(--header)',
              borderRadius: 8, padding: '8px 12px', lineHeight: 1.7,
            }}>
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              background: busy ? 'var(--border)' : 'var(--accent)',
              color: busy ? 'var(--muted)' : 'var(--on-accent)',
              border: 'none', borderRadius: 10, padding: 12,
              fontSize: 15, fontWeight: 700,
            }}
          >
            {busy ? '…لحظة' : 'دخول'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}
