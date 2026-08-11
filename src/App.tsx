// الهيكل العام: الترويسة، ثم الصفحة الحالية بحسب المسار، والطبقات فوقهما.
// الصفحات المحجوبة عن الزوار تُردّ إلى التصفّح، لا أن تُعرض فارغة.

import { useEffect, useState } from 'react'
import { useLibrary } from './lib/library'
import { navigate, useRoute } from './lib/router'
import Header from './components/Header'
import LoginOverlay from './components/LoginOverlay'
import SearchOverlay from './components/SearchOverlay'
import SettingsOverlay from './components/SettingsOverlay'
import Landing from './views/Landing'
import Browse from './views/Browse'
import BookDetail from './views/BookDetail'
import Stats from './views/Stats'
import AddBook from './views/AddBook'
import { AuthorPage, AuthorsIndex } from './views/Authors'

export default function App() {
  const route = useRoute()
  const { loading, error, setError, isOwner, canEdit, settings } = useLibrary()

  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const vis = settings.visibility
  const canSeeAuthors = isOwner || vis.authors
  const canSeeStats = isOwner || vis.stats

  // الانتقال يُغلق ما كان مفتوحًا من الطبقات
  useEffect(() => {
    setShowSearch(false)
    setShowSettings(false)
  }, [route])

  // مسارٌ لا يملكه هذا الزائر يُردّ إلى التصفّح
  useEffect(() => {
    if (route.name === 'add' && !canEdit) navigate({ name: 'browse' })
    if ((route.name === 'authors' || route.name === 'author') && !canSeeAuthors) navigate({ name: 'browse' })
    if (route.name === 'stats' && !canSeeStats) navigate({ name: 'browse' })
  }, [route, canEdit, canSeeAuthors, canSeeStats])

  // نافذة الإعدادات لصاحب المكتبة وحده، فتُغلق إن خرج
  useEffect(() => { if (!isOwner) setShowSettings(false) }, [isOwner])

  return (
    <>
      <Header
        route={route}
        onOpenSearch={() => setShowSearch(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenLogin={() => setShowLogin(true)}
      />

      {error && (
        <div
          role="alert"
          style={{
            maxWidth: 1320, margin: '16px auto 0', padding: '10px 16px',
            background: 'oklch(0.95 0.04 28)', color: 'oklch(0.4 0.13 28)',
            border: '1px solid oklch(0.8 0.08 28)', borderRadius: 10,
            fontSize: 13, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12,
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="إخفاء التنبيه"
            style={{ border: 'none', background: 'none', color: 'inherit', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '90px 20px', color: 'var(--muted)' }}>…جاري التحميل</div>
      ) : (
        <>
          {route.name === 'landing' && (
            <Landing
              onOpenSearch={() => setShowSearch(true)}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}
          {route.name === 'browse' && <Browse />}
          {route.name === 'book' && <BookDetail bookId={route.id} />}
          {route.name === 'authors' && canSeeAuthors && <AuthorsIndex />}
          {route.name === 'author' && canSeeAuthors && <AuthorPage authorId={route.id} />}
          {route.name === 'add' && canEdit && <AddBook />}
          {route.name === 'stats' && canSeeStats && <Stats />}
        </>
      )}

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showSettings && isOwner && <SettingsOverlay onClose={() => setShowSettings(false)} />}
      {showLogin && <LoginOverlay onClose={() => setShowLogin(false)} />}
    </>
  )
}
