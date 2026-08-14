// الهيكل العام: الترويسة، ثم الصفحة الحالية بحسب المسار، والطبقات فوقهما.
// الصفحات المحجوبة عن الزوار تُردّ إلى التصفّح، لا أن تُعرض فارغة.

import { lazy, Suspense, useEffect, useState } from 'react'
import { useLibrary } from './lib/library'
import { navigate, useRoute } from './lib/router'
import Header from './components/Header'
import SearchOverlay from './components/SearchOverlay'
import Landing from './views/Landing'
import Browse from './views/Browse'

// المسار الذي يسلكه كل زائر — الهبوط ثم التصفّح — يبقى في الحزمة الأولى، وما
// سواه يُجلب عند طلبه: صفحاتٌ لا تُفتح في كل زيارة، ونوافذُ لصاحب المكتبة
// وحده. هذا يقصّ من الحزمة التي تُنتظر قبل أول رسم.
const About = lazy(() => import('./views/About'))
const BookDetail = lazy(() => import('./views/BookDetail'))
const AddBook = lazy(() => import('./views/AddBook'))
const Stats = lazy(() => import('./views/Stats'))
const AuthorsIndex = lazy(() => import('./views/Authors').then((m) => ({ default: m.AuthorsIndex })))
const AuthorPage = lazy(() => import('./views/Authors').then((m) => ({ default: m.AuthorPage })))
const PublishersView = lazy(() => import('./views/Publishers'))
const LoginOverlay = lazy(() => import('./components/LoginOverlay'))
const SettingsOverlay = lazy(() => import('./components/SettingsOverlay'))
const ViewerSettingsOverlay = lazy(() => import('./components/ViewerSettingsOverlay'))

const loadingBox = (
  <div style={{ textAlign: 'center', padding: '90px 20px', color: 'var(--muted)' }}>…جاري التحميل</div>
)

export default function App() {
  const route = useRoute()
  const { loading, error, setError, isOwner, canEdit, settings } = useLibrary()

  // نصّ حقل البحث السريع في الرأس ينتقل إلى اللوحة عند فتحها
  const [search, setSearch] = useState<{ open: boolean; query: string }>(
    { open: false, query: '' },
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const vis = settings.visibility
  const canSeeAuthors = isOwner || vis.authors
  const canSeeStats = isOwner || vis.stats

  // الانتقال يُغلق ما كان مفتوحًا من الطبقات
  useEffect(() => {
    setSearch({ open: false, query: '' })
    setShowSettings(false)
  }, [route])

  // مسارٌ لا يملكه هذا الزائر يُردّ إلى التصفّح
  useEffect(() => {
    if (route.name === 'add' && !canEdit) navigate({ name: 'browse' })
    if ((route.name === 'authors' || route.name === 'author') && !canSeeAuthors) navigate({ name: 'browse' })
    if (route.name === 'stats' && !canSeeStats) navigate({ name: 'browse' })
  }, [route, canEdit, canSeeAuthors, canSeeStats])

  // لا تُغلق نافذة الإعدادات عند الخروج: للزائر نافذتُه المبسّطة، والعرض
  // نفسه يتفرّع على isOwner فلا يبقى لغير المالك سبيلٌ إلى إعدادات المكتبة.

  const openSearch = (query = '') => setSearch({ open: true, query })

  return (
    <>
      <Header
        route={route}
        onOpenSearch={openSearch}
        onOpenSettings={() => setShowSettings(true)}
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

      {loading ? loadingBox : (
        <Suspense fallback={loadingBox}>
          {route.name === 'landing' && (
            <Landing
              onOpenSearch={openSearch}
              onOpenLogin={() => setShowLogin(true)}
            />
          )}
          {route.name === 'about' && <About />}
          {route.name === 'browse' && <Browse />}
          {route.name === 'book' && <BookDetail bookId={route.id} />}
          {route.name === 'authors' && canSeeAuthors && <AuthorsIndex />}
          {route.name === 'author' && canSeeAuthors && <AuthorPage authorId={route.id} />}
          {route.name === 'add' && canEdit && <AddBook />}
          {route.name === 'stats' && canSeeStats && <Stats />}
          {route.name === 'publishers' && <PublishersView />}
        </Suspense>
      )}

      {search.open && (
        <SearchOverlay
          initialQuery={search.query}
          onClose={() => setSearch({ open: false, query: '' })}
        />
      )}
      {/* حدُّ تعليقٍ منفصل للنوافذ: انتظارُ نافذةٍ لا يمحو الصفحة تحتها */}
      <Suspense fallback={null}>
        {showSettings && (
          isOwner
            ? <SettingsOverlay onClose={() => setShowSettings(false)} />
            : <ViewerSettingsOverlay onClose={() => setShowSettings(false)} />
        )}
        {showLogin && <LoginOverlay onClose={() => setShowLogin(false)} />}
      </Suspense>
    </>
  )
}
