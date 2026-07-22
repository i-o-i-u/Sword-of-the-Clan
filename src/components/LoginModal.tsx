import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

export default function LoginModal() {
  const { loginOpen, closeLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!loginOpen) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('فشل تسجيل الدخول: تحقق من البريد الإلكتروني وكلمة المرور.')
      setLoading(false)
      return
    }
    // نجاح تسجيل الدخول يُغلق النافذة تلقائيًا عبر onAuthStateChange في AuthContext
  }

  return (
    <div className="modal-backdrop" onClick={closeLogin}>
      <form className="modal-card login-card" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2 className="login-title">تسجيل الدخول</h2>
        <p className="login-subtitle">التصفّح متاح للجميع دون حساب — الدخول مطلوب فقط لإجراء تعديلات</p>

        <label className="field">
          <span>البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            dir="ltr"
            autoFocus
          />
        </label>

        <label className="field">
          <span>كلمة المرور</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            dir="ltr"
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={closeLogin} disabled={loading}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...جاري الدخول' : 'تسجيل الدخول'}
          </button>
        </div>
      </form>
    </div>
  )
}
