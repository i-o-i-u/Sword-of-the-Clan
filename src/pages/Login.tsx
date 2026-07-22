import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('فشل تسجيل الدخول: تحقق من البريد الإلكتروني وكلمة المرور.')
    }
    setLoading(false)
  }

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">📚 مكتبة سيف العشيرة</h1>
        <p className="login-subtitle">تسجيل الدخول للوصول إلى الفهرس</p>

        <label className="field">
          <span>البريد الإلكتروني</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            dir="ltr"
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

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '...جاري الدخول' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  )
}
