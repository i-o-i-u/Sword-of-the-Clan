// دخول صاحب المكتبة (§٥-٨).
// المصادقة على Convex: أول حسابٍ يُنشأ يَحجز ملكية المكتبة مرةً واحدة، ولا
// يُقبل بريدٌ غير OWNER_EMAIL المضبوط على النشر، فلا يُنشأ حسابٌ ثانٍ أصلًا.

import { useState, type FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { claimOwnership, fetchOwnerRecord, ownerExists } from '../lib/api'
import { useLibrary } from '../lib/library'
import { CloseButton, Overlay, cardStyle, tone } from './ui'

const MIN_PASSWORD = 8

/**
 * رسائل خطأ الدخول. رفضُ البريد يأتي من OWNER_EMAIL في الخادم برسالةٍ عربية
 * مفهومة، فتُمرَّر كما هي؛ وما عداه فبيانات خاطئة.
 */
function describeSignInError(error: unknown): string {
  // ما يرميه الخادمُ ليُقرأ نصُّه في `data` (`ConvexError`)، وفي الإنتاج لا يبقى
  // من غيره إلا «Server Error» — فكان كلُّ إخفاقٍ يُقرأ «كلمة السر غير صحيحة»
  const data = error && typeof error === 'object' && 'data' in error
    ? String((error as { data: unknown }).data ?? '') : ''
  const message = data || (error instanceof Error ? error.message : String(error ?? ''))
  if (message.includes('مستخدم واحد')) return 'هذا البريد ليس بريد صاحب المكتبة.'
  if (message.includes('OWNER_EMAIL')) {
    return 'إعداد الخادم ناقص: OWNER_EMAIL غير مضبوط على نشر Convex.'
  }
  return 'البريد أو كلمة السر غير صحيحة.'
}

export default function LoginOverlay({ onClose }: { onClose: () => void }) {
  const { signIn } = useAuthActions()
  const { hasOwnerAccount, refreshRole } = useLibrary()
  const firstRun = !hasOwnerAccount

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)


  /**
   * يحجز ملكية المكتبة، ويتسامح مع كونها محجوزةً لهذا الحساب نفسه (كأن تُضغط
   * مرتين). فإن كانت لحسابٍ آخر قيل ذلك صراحةً بدل رسالة قاعدة بيانات غامضة.
   */
  async function takeOwnership(displayName: string) {
    try {
      await claimOwnership('', displayName)
    } catch (err) {
      // الملكية لنا أصلًا (كأن تُضغط مرتين) فلا شيء يُفعل
      const record = await fetchOwnerRecord()
      if (record) return

      // استعلامُ الملكية يُخفي صفّ غيرنا، فلا يكفي غيابُه للحكم بأنها محجوزة.
      // ownerExists لا يشترط مصادقة، وهي وحدها تفصل بين الحالتين.
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
    setBusy(true)
    try {
      if (firstRun) {
        if (!name.trim() || !email.trim() || password.length < MIN_PASSWORD) {
          setError(`أكمِل الاسم والبريد وكلمةً لا تقل عن ${MIN_PASSWORD} أحرف.`)
          return
        }
        // Convex يُنشئ الحساب ويفتح الجلسة في خطوةٍ واحدة: لا تأكيد بريد،
        // فلا حاجة إلى محاولة إنقاذٍ بعدها كما كان الحال مع Supabase.
        try {
          await signIn('password', { email: email.trim(), password, flow: 'signUp' })
        } catch (signUpError) {
          // الحساب مُنشأٌ من قبل: ندخل به ثم نحجز الملكية إن لم تُحجز
          try {
            await signIn('password', { email: email.trim(), password, flow: 'signIn' })
          } catch {
            setError(describeSignInError(signUpError))
            return
          }
        }
        await takeOwnership(name.trim())
      } else {
        try {
          await signIn('password', { email: email.trim(), password, flow: 'signIn' })
        } catch (signInError) {
          setError(describeSignInError(signInError))
          return
        }
        // إن كان الحساب أُنشئ ولم تُحجز الملكية بعد فتُحجز الآن
        if (!(await ownerExists())) {
          await takeOwnership(name.trim() || 'صاحب المكتبة')
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
          // النسبة المئوية لا `vw`: البطاقة داخل `#root` المكبَّر بـ zoom،
          // و`vw` لا تتبع التكبير فتخرج البطاقةُ عن الشاشة كلّما كبّر القارئ
          ...cardStyle, width: 'min(420px, 100%)', borderRadius: 18,
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
              fontSize: 12.5, ...tone('danger'),
              borderRadius: 8, padding: '8px 12px',
            }}>
              {error}
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
            {busy ? '…لحظة' : firstRun ? 'إنشاء الحساب' : 'دخول'}
          </button>

          {/* استردادُ كلمة السرّ: لا بريدَ يُرسَل من المكتبة، فتُعاد من لوحة Convex
              بإجراءٍ داخليّ لا يبلغه متصفِّح (`account.resetPassword`) */}
          {!firstRun && (
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
              <button
                type="button"
                onClick={() => setForgot((v) => !v)}
                aria-expanded={forgot}
                style={{ border: 'none', background: 'none', padding: 0, color: 'var(--accent-soft)', textDecoration: 'underline', fontSize: 12 }}
              >
                نسيتَ كلمة السرّ؟
              </button>
              {forgot && (
                <div style={{ marginTop: 6 }}>
                  تُعاد من لوحة Convex لنشر الإنتاج: <em>Functions ← account ← resetPassword</em>،
                  وتُكتب فيه كلمةُ السرّ الجديدة. أو من سطر الأوامر:
                  <code dir="ltr" style={{ display: 'block', marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {`npx convex run --prod account:resetPassword '{"password":"…"}'`}
                  </code>
                  وتُنهى معها الجلساتُ القائمة كلُّها.
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Overlay>
  )
}
