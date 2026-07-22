import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { SettingsProvider } from './lib/settings'
import { useHashView } from './lib/useHashView'
import AppHeader from './components/AppHeader'
import LoginModal from './components/LoginModal'
import SettingsPanel from './components/SettingsPanel'
import Landing from './pages/Landing'
import BooksBrowse from './pages/BooksBrowse'
import VisitsLog from './pages/VisitsLog'
import BorrowsLog from './pages/BorrowsLog'

const AUTO_OPEN_KEY = 'sotc-auto-open-add-book'

function AppShell() {
  const { loading } = useAuth()
  const [view, navigate] = useHashView()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { requireAuth } = useAuth()

  async function handleAddBookGlobal() {
    const ok = await requireAuth()
    if (!ok) return
    sessionStorage.setItem(AUTO_OPEN_KEY, '1')
    navigate('books')
  }

  if (loading) {
    return (
      <div className="center-screen">
        <p>...جاري التحميل</p>
      </div>
    )
  }

  return (
    <div className="page">
      <AppHeader
        view={view}
        onNavigate={navigate}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddBook={handleAddBookGlobal}
      />

      <main className="content">
        {view === 'landing' && <Landing onNavigate={navigate} onAddBook={handleAddBookGlobal} />}
        {view === 'books' && <BooksBrowse />}
        {view === 'visits' && <VisitsLog />}
        {view === 'borrows' && <BorrowsLog />}
      </main>

      <footer className="app-footer">
        <p>مكتبة سيف العشيرة — التصفّح متاح للجميع، والتعديل يتطلّب حساب المالك.</p>
      </footer>

      <LoginModal />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SettingsProvider>
  )
}
