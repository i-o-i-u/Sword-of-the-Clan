// الهيكل العام: الترويسة، ثم الصفحة الحالية بحسب المسار، والطبقات فوقهما.
// الصفحات المحجوبة عن الزوار تُردّ إلى التصفّح، لا أن تُعرض فارغة.

import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { useLibrary } from './lib/library'
import { navigate, useRoute } from './lib/router'
import Header from './components/Header'
import SearchOverlay from './components/SearchOverlay'
import Landing from './views/Landing'
import Browse from './views/Browse'

/** علامةُ إعادةِ تحميلٍ جرت، تمنع الدوران عليها */
const RELOAD_MARK = 'chunk-reloaded'

/**
 * قطعةٌ تُجلب عند طلبها، ولا تدع إخفاقَ الجلب يُسقط الصفحة.
 *
 * فجلبُ القطعة قد يُخفق لأسبابٍ ليست في الشيفرة: نشرةٌ جديدة نزلت والصفحةُ
 * مفتوحةٌ بحزمةٍ سابقة، أو انقطعت الشبكة لحظةً — وهو على الجوّال أكثر. ثم
 * يرتفع الإخفاقُ إلى حدّ الخطأ فيُمحى ما على الشاشة كلُّه، وإنما العلّةُ
 * طلبٌ واحدٌ ضاع.
 *
 * فيُعاد الطلبُ مرّةً بعد مهلةٍ يسيرة، فإن أخفق أُعيد تحميلُ الصفحة مرّةً
 * واحدة — وهو الذي يشفي حالَ النشرةِ الجديدة قطعًا، إذ يجلب فهرسها الجديد.
 * والعلامةُ في `sessionStorage` تمنع أن يدور الموقعُ على نفسه لو كان العطبُ
 * مقيمًا، فتظهر الرسالةُ عندئذٍ ويُقال للقارئ ما جرى.
 */
// `any` هنا مقصود: الوسيط يحمل نوعَ المكوِّن كما هو بخصائصه، فيبقى
// `<BookDetail bookId=… />` مفحوصًا كما كان قبل اللفّ. و`unknown` مكانَه
// يمحو الخصائص فيسقط الفحص عن مواضع النداء كلِّها.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await load()
    } catch {
      await new Promise((done) => setTimeout(done, 700))
      try {
        return await load()
      } catch (err) {
        if (!sessionStorage.getItem(RELOAD_MARK)) {
          sessionStorage.setItem(RELOAD_MARK, '1')
          window.location.reload()
        }
        throw err
      }
    }
  })
}

// المسار الذي يسلكه كل زائر — الهبوط ثم التصفّح — يبقى في الحزمة الأولى، وما
// سواه يُجلب عند طلبه: صفحاتٌ لا تُفتح في كل زيارة، ونوافذُ لصاحب المكتبة
// وحده. هذا يقصّ من الحزمة التي تُنتظر قبل أول رسم.
const About = page(() => import('./views/About'))
const BookDetail = page(() => import('./views/BookDetail'))
const AddBook = page(() => import('./views/AddBook'))
const Stats = page(() => import('./views/Stats'))
const AuthorsIndex = page(() => import('./views/Authors').then((m) => ({ default: m.AuthorsIndex })))
const AuthorPage = page(() => import('./views/Authors').then((m) => ({ default: m.AuthorPage })))
const PublishersView = page(() => import('./views/Publishers'))
const PublisherPage = page(() => import('./views/Publishers').then((m) => ({ default: m.PublisherPage })))
const People = page(() => import('./views/People'))
const Series = page(() => import('./views/Series'))
const Perks = page(() => import('./views/Perks'))
const PerkPage = page(() => import('./views/Perks').then((m) => ({ default: m.PerkPage })))
const LoginOverlay = page(() => import('./components/LoginOverlay'))
const SettingsOverlay = page(() => import('./components/SettingsOverlay'))
const ViewerSettingsOverlay = page(() => import('./components/ViewerSettingsOverlay'))

/*
 * ما يُعرض ريثما تُجلب قطعةُ الصفحة وتصل بياناتُها. وكان سطرًا مكتوبًا في
 * وسط بياضٍ — «…جاري التحميل» — فصار ألواحًا تنبض في مواضع ما سيأتي: عنوانٌ
 * فسطورٌ تحته. فتُعرف هيئةُ الصفحة قبل أن تحلّ فيها، ولا يُرى البياضُ عطبًا.
 */
const loadingBox = (
  <div className="wait" aria-label="جارٍ التحميل" aria-busy="true">
    <span /><span /><span /><span />
  </div>
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

  // بلغت الصفحةُ الرسمَ سالمةً، فتُرفع علامةُ إعادة التحميل: إخفاقٌ آخرُ
  // بعد اليوم يستحقّ إعادةً أخرى، وإنما مُنعت لئلّا يدور على نفسه.
  useEffect(() => { sessionStorage.removeItem(RELOAD_MARK) }, [])

  // الانتقال يُغلق ما كان مفتوحًا من الطبقات
  useEffect(() => {
    setSearch({ open: false, query: '' })
    setShowSettings(false)
  }, [route])

  // مسارٌ لا يملكه هذا الزائر يُردّ إلى التصفّح
  useEffect(() => {
    if ((route.name === 'add' || route.name === 'edit') && !canEdit) navigate({ name: 'browse' })
    // صفحةُ «المحقِّقون ونحوهم» تعرض تراجمَ أشخاصٍ كصفحة المؤلِّفين، فحكمُها
    // حكمُها: من حجب صفحاتِ التراجم حجبها معها
    if ((route.name === 'authors' || route.name === 'author' || route.name === 'people')
      && !canSeeAuthors) navigate({ name: 'browse' })
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

      {/* الهبوطُ يُرسم قبل وصول البيانات: إطارُه وشعارُه واسمُه وأزرارُه لا
          تنتظر شيئًا، والصورةُ والاقتباسُ يحلّان في مواضعهما متى وصلا. وكان
          الحجبُ يعمّ الصفحة كلَّها فيرى الداخلُ «…جاري التحميل» وحده طولَ
          ما تُفتح الوصلة وتعود الاستعلامات — وأكثرُ ما شُكي منه هذا.
          وما سوى الهبوط يبقى محجوبًا: صفحةٌ تقول «لا توجد كتب» ثم تمتلئ
          أسوأُ من انتظارٍ صريح. */}
      {route.name === 'landing' ? (
        <Landing
          onOpenSearch={openSearch}
          onOpenLogin={() => setShowLogin(true)}
        />
      ) : loading ? loadingBox : (
        <Suspense fallback={loadingBox}>
          {route.name === 'about' && <About />}
          {route.name === 'browse' && <Browse />}
          {route.name === 'book' && <BookDetail bookId={route.id} />}
          {route.name === 'authors' && canSeeAuthors && <AuthorsIndex />}
          {route.name === 'author' && canSeeAuthors && <AuthorPage authorId={route.id} />}
          {route.name === 'add' && canEdit && <AddBook />}
          {route.name === 'edit' && canEdit && <AddBook bookId={route.id} />}
          {route.name === 'stats' && canSeeStats && <Stats />}
          {route.name === 'publishers' && <PublishersView />}
          {route.name === 'publisher' && <PublisherPage publisherId={route.id} />}
          {route.name === 'people' && canSeeAuthors && <People />}
          {route.name === 'series' && <Series />}
          {route.name === 'perks' && <Perks tab={route.tab} />}
          {route.name === 'perk' && <PerkPage perkId={route.id} />}
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
