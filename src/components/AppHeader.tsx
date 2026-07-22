import { useState } from 'react'
import Logo from './Logo'
import { useAuth } from '../lib/AuthContext'
import { View } from '../lib/useHashView'

interface Props {
  view: View
  onNavigate: (v: View) => void
  onOpenSettings: () => void
  onAddBook: () => void
}

const NAV_ITEMS: { view: View; label: string; icon: string }[] = [
  { view: 'books', label: 'تصفّح الكتب', icon: '📚' },
  { view: 'visits', label: 'سجلّ الزيارات', icon: '📝' },
  { view: 'borrows', label: 'سجلّ الاستعارات', icon: '🔄' },
]

export default function AppHeader({ view, onNavigate, onOpenSettings, onAddBook }: Props) {
  const { session, signOut, requireAuth } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleAddBook() {
    setMenuOpen(false)
    const ok = await requireAuth()
    if (ok) onAddBook()
  }

  return (
    <header className="app-header">
      <button className="brand" onClick={() => onNavigate('landing')} aria-label="الصفحة الرئيسية">
        <Logo size={34} />
        <span className="brand-title">مكتبة سيف العشيرة</span>
      </button>

      <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            className={`nav-link ${view === item.view ? 'is-active' : ''}`}
            onClick={() => {
              onNavigate(item.view)
              setMenuOpen(false)
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button className="nav-link nav-link-cta" onClick={handleAddBook}>
          <span className="nav-icon">➕</span>
          إضافة كتاب
        </button>
      </nav>

      <div className="header-actions">
        {session ? (
          <>
            <span className="user-email">{session.user.email}</span>
            <button className="btn btn-small" onClick={signOut}>
              تسجيل الخروج
            </button>
          </>
        ) : (
          <span className="guest-badge">وضع التصفّح — بلا حساب</span>
        )}
        <button className="icon-btn" onClick={onOpenSettings} aria-label="الإعدادات" title="الإعدادات">
          ⚙️
        </button>
        <button
          className="icon-btn nav-toggle"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="فتح القائمة"
        >
          ☰
        </button>
      </div>
    </header>
  )
}
