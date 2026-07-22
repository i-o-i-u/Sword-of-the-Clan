import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

interface AuthState {
  session: Session | null
  loading: boolean
  loginOpen: boolean
  /** يفتح نافذة تسجيل الدخول إن لم يكن هناك حساب مسجَّل، ويُرجع وعدًا
   *  يتحقق إلى true عند نجاح الدخول أو false إن أُلغيت العملية. تُستخدم
   *  قبل أي إجراء تعديل (إضافة/تحديث/حذف). */
  requireAuth: () => Promise<boolean>
  closeLogin: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession && resolverRef.current) {
        resolverRef.current(true)
        resolverRef.current = null
        setLoginOpen(false)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  function requireAuth(): Promise<boolean> {
    if (session) return Promise.resolve(true)
    setLoginOpen(true)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }

  function closeLogin() {
    setLoginOpen(false)
    if (resolverRef.current) {
      resolverRef.current(false)
      resolverRef.current = null
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value: AuthState = { session, loading, loginOpen, requireAuth, closeLogin, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
