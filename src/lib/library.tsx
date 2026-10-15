// حالة المكتبة كلها في مكانٍ واحد: الدور (صاحب المكتبة أو زائر)، والبيانات،
// والإعدادات. كل تعديل يُطبَّق محليًّا أولًا ليبقى العمل سلسًا، ثم يُحفظ في
// قاعدة البيانات؛ فإن أخفق الحفظ ظهرت رسالة وأُعيد التحميل من المصدر.
//
// **والبياناتُ حيّة**: المكتبةُ تُرصد (`api.watchSnapshot`) فيصل كلُّ تبدُّلٍ
// فيها وحده، والفوائدُ تُرصد على حِدَة متى طلبتها صفحة (`useNeedPerks`).

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import * as api from './api'
import { applyTheme } from './theme'
import {
  DEFAULT_SETTINGS_EXTRAS, DEFAULT_VISIBILITY,
  type Author, type Book, type BookWork, type Category, type LandingImage,
  type LandingQuote, type Loan, type Notebook, type Perk, type PerkCategory,
  type PerkFigure, type PerkKindDef, type Publisher, type Settings,
  perkCategoriesOf, perkKindsOf,
} from './types'
import { perkIndex as buildPerkIndex, type PerkIndex } from './perks'

const EMPTY_SETTINGS: Settings = {
  theme: 'warm', font: 'kitab', ui_scale: 100,
  show_status_dots: true, show_ratings: true,
  default_view: 'grid', currency: 'ريال',
  landing_title: 'مكتبة سيف العشيرة',
  landing_tagline: 'فهرسٌ حيّ لكل كتابٍ في البيت',
  landing_intro: '',
  show_landing_stats: true, show_landing_quote: true,
  auto_rotate: true, rotate_seconds: 6, quote_seconds: 12,
  about_text: '', x_url: '', telegram_url: '',
  visibility: DEFAULT_VISIBILITY,
  hidden_fields: [], hidden_categories: [], hidden_book_ids: [],
  ...DEFAULT_SETTINGS_EXTRAS,
}

interface LibraryValue {
  loading: boolean
  error: string | null
  setError: (msg: string | null) => void

  // الدور
  isAuthenticated: boolean
  isOwner: boolean
  ownerName: string
  hasOwnerAccount: boolean
  browseOnly: boolean
  /** صاحب المكتبة خارج «وضع التصفُّح فقط» */
  canEdit: boolean
  toggleBrowseOnly: () => void
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>

  // البيانات
  books: Book[]
  authors: Author[]
  works: BookWork[]
  /**
   * فوائدُ الكنّاش. **لا تصل حتى تُطلب** (`useNeedPerks`): هي أثقلُ ما في
   * المكتبة، ولا حاجة إليها لمن فتح صفحة الهبوط أو الفهرس.
   */
  perks: Perk[]
  /** أوصلت الفوائد؟ وقبله `perks` فارغةٌ لا لأنّ الكنّاش خالٍ، بل لأنها في الطريق */
  perksReady: boolean
  /** يطلب الفوائد: يبدأ رصدُها أوّلَ مرّة، ثم تبقى مرصودةً ما دام اللسانُ مفتوحًا */
  wantPerks: () => void
  /** نصوصُ الفوائد مُطبَّعةً للبحث، تُحسب مرّةً لكل تبدُّلٍ فيها */
  perkIndex: PerkIndex
  /** أنواعُ الفوائد وتصنيفاتُها كما حُرِّرت، وإلّا فالمبدئيّة — محسوبةً مرّةً */
  perkKindList: PerkKindDef[]
  perkCategoryList: PerkCategory[]
  /** أثاثُ قسم الفوائد: أنواعُه وتصنيفاتُه وأعلامُه وكرّاساتُه */
  perkKinds: PerkKindDef[]
  perkCategories: PerkCategory[]
  perkFigures: PerkFigure[]
  notebooks: Notebook[]
  loans: Loan[]
  publishers: Publisher[]
  /** التصنيفات كلُّها، رئيسُها وفرعُها. الرئيسُ ما كان `parent` فيه فارغًا. */
  categories: Category[]
  /** أسماء التصانيف الرئيسة وحدها، وهي التي يُصنَّف بها الكتاب أوّلًا */
  mainCategories: string[]
  landingImages: LandingImage[]
  landingQuotes: LandingQuote[]
  settings: Settings

  authorById: (id: string | null) => Author | null
  bookById: (id: string) => Book | undefined

  reload: () => Promise<void>
  patchBook: (id: string, patch: api.BookInput) => Promise<void>
  patchAuthor: (id: string, patch: Partial<Author>) => Promise<void>
  patchSettings: (patch: Partial<Settings>) => Promise<void>
  /** يبدّل المظهر: يحفظه صاحبُ المكتبة، ويبقى عند الزائر تفضيلًا في متصفحه */
  cycleTheme: () => void
  /** تفضيل الزائر لنفسه: يسري فورًا ويُحفظ في متصفّحه لا في المكتبة */
  setViewerPref: (patch: ViewerPrefs) => void
  /** تعديلٌ يسري على الشاشة ولا يُرسَل — نافذة الإعدادات تعاين به قبل الحفظ */
  previewSettings: (patch: Partial<Settings>) => void
  /** يُهمل المعاينةَ ويردّ الإعداداتِ إلى ما في القاعدة */
  discardPreview: () => void
  /** يحفظ الإعدادات كما هي الآن. زرّ الحفظ في النافذة هو الذي يستدعيه. */
  saveSettings: (next: Settings) => Promise<void>
  /** ينفّذ حفظًا ويعرض خطأه. `true` إن وقع الحفظ. */
  run: (job: () => Promise<void>) => Promise<boolean>
  /** تعديلُ دار: يسري على الشاشة فورًا، ويُزامَن اسمُها وبلدُها على كتبها */
  patchPublisher: (id: string, patch: Partial<Publisher>) => Promise<void>
  /**
   * استقرّ الدور: عُرف أصاحبُ المكتبة الطالبُ أم زائر. وقبله `isOwner`
   * فارغٌ لا لأنه زائر، بل لأنه لم يُعرف بعد — فلا يُحكم به على مسار.
   */
  roleReady: boolean
}

const VIEWER_PREFS_KEY = 'lib-viewer-prefs'

/**
 * ما يختاره الزائر لنفسه من مظهرٍ وخطٍّ وحجم. لا يُحفظ في المكتبة — فليس
 * له أن يغيّر ما يراه غيره — بل في متصفّحه وحده.
 */
export type ViewerPrefs = Partial<Pick<Settings, 'theme' | 'font' | 'ui_scale'>>

/**
 * إعدادات المكتبة كما جاءت من الخادم، مخلوطةً بما اختاره الزائر لنفسه. صاحبُ
 * المكتبة لا يُخلط له شيء: يرى ما حفظه هو.
 */
function withViewerPrefs(st: Settings, owner: boolean): Settings {
  return owner ? st : { ...st, ...readViewerPrefs() }
}

function readViewerPrefs(): ViewerPrefs {
  try {
    const raw = localStorage.getItem(VIEWER_PREFS_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as ViewerPrefs
    const out: ViewerPrefs = {}
    // ما جاء من التخزين لا يُصدَّق: قيمةٌ محرَّفة تكسر المظهر كلّه
    if (p.theme === 'warm' || p.theme === 'sepia' || p.theme === 'dark') out.theme = p.theme
    if (p.font === 'kitab' || p.font === 'classic' || p.font === 'modern') out.font = p.font
    if (typeof p.ui_scale === 'number' && p.ui_scale >= 85 && p.ui_scale <= 125) {
      out.ui_scale = p.ui_scale
    }
    return out
  } catch { return {} }
}

const LibraryContext = createContext<LibraryValue | null>(null)

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary خارج LibraryProvider')
  return ctx
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut: authSignOut } = useAuthActions()
  const [isOwner, setIsOwner] = useState(false)
  const [ownerName, setOwnerName] = useState('صاحب المكتبة')
  const [hasOwnerAccount, setHasOwnerAccount] = useState(true)
  const [browseOnly, setBrowseOnly] = useState(false)
  const [roleReady, setRoleReady] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [works, setWorks] = useState<BookWork[]>([])
  const [perks, setPerks] = useState<Perk[]>([])
  const [perksReady, setPerksReady] = useState(false)
  const [perksWanted, setPerksWanted] = useState(false)
  const [perkKinds, setPerkKinds] = useState<PerkKindDef[]>([])
  const [perkCategories, setPerkCategories] = useState<PerkCategory[]>([])
  const [perkFigures, setPerkFigures] = useState<PerkFigure[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [landingImages, setLandingImages] = useState<LandingImage[]>([])
  const [landingQuotes, setLandingQuotes] = useState<LandingQuote[]>([])
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)

  // ---------------------------------------------------------------- الدور
  const resolveRole = useCallback(async (authed: boolean) => {
    if (!authed) {
      setIsOwner(false)
      setBrowseOnly(false)
      try { setHasOwnerAccount(await api.ownerExists()) } catch { /* يبقى على حاله */ }
      return
    }
    try {
      const record = await api.fetchOwnerRecord()
      setIsOwner(!!record)
      setHasOwnerAccount(record ? true : await api.ownerExists().catch(() => true))
      if (record) setOwnerName(record.display_name || 'صاحب المكتبة')
    } catch (e) {
      // الدخول نجح لكن تعذّرت قراءة صفّ الملكية. الصمت هنا يُظهر المالكَ
      // زائرًا بلا تفسير، فيُقال السبب صراحةً.
      setIsOwner(false)
      setError('دخلتَ بحسابك، لكن تعذّر التحقّق من ملكية المكتبة: ' + describe(e))
    }
  }, [])

  // useConvexAuth هو مصدر حالة الجلسة، ويتغيّر وحده عند الدخول والخروج، فلا
  // حاجة إلى مشترِكٍ يدويّ كما كان في Supabase.
  useEffect(() => {
    if (authLoading) return
    let alive = true
    resolveRole(isAuthenticated).finally(() => { if (alive) setRoleReady(true) })
    return () => { alive = false }
  }, [authLoading, isAuthenticated, resolveRole])

  const refreshRole = useCallback(async () => {
    await resolveRole(isAuthenticated)
  }, [isAuthenticated, resolveRole])

  const signOut = useCallback(async () => {
    await authSignOut()
    setBrowseOnly(false)
  }, [authSignOut])

  // ------------------------------------------------------------- التحميل
  // التحميل يبدأ قبل أن يستقرّ الدور، فيُقرأ الدورُ من مرجعٍ لا من الحالة
  // كيلا يُعاد بناء `reload` كلما تبدّل، وتُحفظ نسخةُ الخادم من الإعدادات
  // ليُعاد خلطُها متى عُرف الدور بلا طلبٍ جديد.
  const isOwnerRef = useRef(isOwner)
  isOwnerRef.current = isOwner
  const serverSettings = useRef<Settings | null>(null)
  /**
   * ما يُعايَن في نافذة الإعدادات ولم يُحفظ. **يبقى فوق ما يصل من الخادم**:
   * المكتبةُ حيّة، فكلُّ حفظٍ — ورفعُ صورة هبوطٍ من النافذة نفسها حفظ — يُرسل
   * الإعداداتِ من جديد، فلو كُتبت كما هي لمحت ما يُعايَن في وسط العمل.
   */
  const preview = useRef<Partial<Settings> | null>(null)

  // التحميلات صارت تتسابق: أوّلُها يبدأ قبل المصادقة، ويليه تحميلُ صاحب
  // المكتبة إذا تبيّن دورُه. فلو تأخّر جوابُ الأوّل عن الثاني لكتب بياناتِ
  // الزائر فوق بيانات المالك. ورقمُ النوبة يحسم ذلك: لا يُقبل إلا جوابُ
  // آخرِ تحميلٍ طُلب.
  const loadSeq = useRef(0)
  /** أَوَصَلت البياناتُ مرّةً؟ ما بعدها يُحمَّل في صمتٍ فلا تُمحى الشاشة */
  const loadedOnce = useRef(false)

  /** يكتب ما وصل من المكتبة في الحال. يناديه الرصدُ ويناديه `reload` */
  const applySnapshot = useCallback((snap: api.LibrarySnapshot) => {
    setBooks(snap.books); setAuthors(snap.authors); setWorks(snap.works)
    setLoans(snap.loans)
    setPerkKinds(snap.perkKinds); setPerkCategories(snap.perkCategories)
    setPerkFigures(snap.perkFigures); setNotebooks(snap.notebooks)
    setPublishers(snap.publishers); setCategories(snap.categories)
    setLandingImages(snap.landingImages); setLandingQuotes(snap.landingQuotes)
    const st = snap.settings
    // الزائر قد يكون اختار لنفسه مظهرًا وخطًّا وحجمًا، فلا يُلغيها التحميل
    serverSettings.current = st
    setSettings({ ...withViewerPrefs(st, isOwnerRef.current), ...(preview.current ?? {}) })
    setError(null)
    loadedOnce.current = true
    setLoading(false)
  }, [])

  /**
   * يقرأ المكتبةَ الآن. وما دام الرصدُ قائمًا فجوابُه من نسخة المتصفّح بلا
   * جولةٍ على الشبكة — والحفظُ في Convex لا يُجاب حتى يصل أثرُه إليها — فمن
   * ناداه بعد حفظٍ وجد ما حفظ. بقي لمواضع النداء كما كانت، ولا يضرّ.
   */
  const reload = useCallback(async () => {
    const seq = ++loadSeq.current
    if (!loadedOnce.current) setLoading(true)
    try {
      const snap = await api.fetchSnapshot()
      if (seq !== loadSeq.current) return // سبقه تحميلٌ أحدث، فجوابُه أولى
      applySnapshot(snap)
    } catch (e) {
      if (seq !== loadSeq.current) return
      setError('تعذّر تحميل بيانات المكتبة: ' + describe(e))
      loadedOnce.current = true
      setLoading(false)
    }
  }, [applySnapshot])

  // الرصدُ يبدأ مع أوّل رسمٍ ولا ينتظر شيئًا — لا جلسةً ولا دورًا.
  //
  // كان التحميلُ ينتظر `authLoading`، وفي ذلك الانتظارِ عِلّةُ بطءٍ محسوسة: من
  // كان له رمزُ جلسةٍ في متصفّحه نادى @convex-dev/auth إجراءَ `auth:signIn`
  // ليجدّده، فتمرّ جولةٌ كاملة على الشبكة **قبل أن يُطلب أوّلُ حرفٍ من
  // البيانات**. فالآن يُرصد الاستعلامُ بهويّة زائرٍ فورًا، **وConvex يُعيده
  // بنفسه إذا استقرّت الجلسة** فيصل صاحبَ المكتبة ما يحقّ له — وكان ذلك
  // تحميلًا ثانيًا يُطلق باليد متى تبيّن الدور.
  useEffect(() => api.watchSnapshot(
    applySnapshot,
    (e) => {
      setError('تعذّر تحميل بيانات المكتبة: ' + describe(e))
      loadedOnce.current = true
      setLoading(false)
    },
  ), [applySnapshot])

  // والفوائدُ تُرصد على حِدَة، أوّلَ مرّةٍ تطلبها صفحة، ثم تبقى
  useEffect(() => {
    if (!perksWanted) return
    return api.watchPerks(
      (rows) => { setPerks(rows); setPerksReady(true) },
      (e) => { setError('تعذّر تحميل الفوائد: ' + describe(e)); setPerksReady(true) },
    )
  }, [perksWanted])
  const wantPerks = useCallback(() => setPerksWanted(true), [])

  // والإعدادات تُخلط بتفضيلات الزائر قبل أن يُعرف الدور، فإن تبيّن أنه صاحب
  // المكتبة رُدّت إليه إعداداته كما حفظها — من النسخة المحفوظة بلا طلبٍ جديد.
  useEffect(() => {
    if (!roleReady || !serverSettings.current) return
    setSettings(withViewerPrefs(serverSettings.current, isOwner))
  }, [roleReady, isOwner])

  // المظهر والخط وحجم الواجهة تُطبَّق على جذر الصفحة
  useEffect(() => {
    applyTheme(settings.theme, settings.font, settings.ui_scale)
  }, [settings.theme, settings.font, settings.ui_scale])

  // -------------------------------------------------------------- التعديل
  /**
   * ينفّذ عمليةَ حفظٍ ويعرض خطأها ويُعيد التحميل عند الإخفاق.
   *
   * ويُخبر بما وقع: `true` إن حُفظ. وكانت لا تُخبر بشيء، فكان من ينادِيها
   * يمضي بعدها كأنّ الحفظ وقع — فتُغلق نافذةُ الفائدة على إخفاقه وتضيع
   * الفائدةُ كلُّها بنصّها وهوامشها.
   */
  const run = useCallback(async (job: () => Promise<void>): Promise<boolean> => {
    try {
      await job()
      setError(null)
      return true
    } catch (e) {
      setError('تعذّر الحفظ: ' + describe(e))
      await reload()
      return false
    }
  }, [reload])

  const patchBook = useCallback(async (id: string, patch: api.BookInput) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } as Book : b)))
    await run(() => api.updateBook(id, patch))
  }, [run])

  const patchAuthor = useCallback(async (id: string, patch: Partial<Author>) => {
    setAuthors((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    // تغيير الاسم يسري على الكتب أيضًا، ويتكفّل مُشغِّل قاعدة البيانات بحفظه
    // ومثلُه حيث كان مؤلِّفًا مشارِكًا أو ذا صفة: الخادمُ يزامن ذلك كلَّه
    if (patch.name !== undefined) {
      const name = patch.name
      setBooks((prev) => prev.map((b) => {
        const mine = b.author_id === id
          || (b.co_authors ?? []).some((c) => c.author_id === id)
          || (b.contributors ?? []).some((c) => c.person_id === id)
        if (!mine) return b
        return {
          ...b,
          author_name: b.author_id === id ? name : b.author_name,
          co_authors: (b.co_authors ?? []).map((c) => (c.author_id === id ? { ...c, name } : c)),
          contributors: (b.contributors ?? []).map(
            (c) => (c.person_id === id ? { ...c, name } : c),
          ),
        }
      }))
    }
    await run(() => api.updateAuthor(id, patch))
  }, [run])

  const patchPublisher = useCallback(async (id: string, patch: Partial<Publisher>) => {
    setPublishers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    // واسمُ الدار وبلدُها مكتوبان على كتبها، والخادمُ يزامنهما — فيُزامَنان
    // ههنا كذلك، وإلّا بقي القديمُ على البطاقات حتى يُعاد التحميل
    if (patch.name !== undefined || patch.place !== undefined) {
      setBooks((prev) => prev.map((b) => {
        let next = b
        if (b.publisher_id === id) {
          next = {
            ...next,
            ...(patch.name !== undefined ? { publisher: patch.name } : {}),
            ...(patch.place !== undefined ? { place: patch.place } : {}),
          }
        }
        if (patch.name !== undefined && b.co_publishers.some((c) => c.publisher_id === id)) {
          next = {
            ...next,
            co_publishers: b.co_publishers.map(
              (c) => (c.publisher_id === id ? { ...c, name: patch.name! } : c),
            ),
          }
        }
        return next
      }))
    }
    await run(() => api.updatePublisher(id, patch))
  }, [run])

  const patchSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    await run(() => api.updateSettings(patch as Record<string, unknown>))
  }, [run])

  const setViewerPref = useCallback((patch: ViewerPrefs) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    try {
      localStorage.setItem(VIEWER_PREFS_KEY, JSON.stringify({ ...readViewerPrefs(), ...patch }))
    } catch { /* لا يضرّ */ }
  }, [])

  const previewSettings = useCallback((patch: Partial<Settings>) => {
    preview.current = { ...(preview.current ?? {}), ...patch }
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const discardPreview = useCallback(() => {
    preview.current = null
    if (serverSettings.current) {
      setSettings(withViewerPrefs(serverSettings.current, isOwnerRef.current))
    }
  }, [])

  const saveSettings = useCallback(async (next: Settings) => {
    // ما حُفظ لم يعد معاينةً: يصل من الخادم بعد الحفظ كما حُفظ
    if (await run(() => api.updateSettings(next as unknown as Record<string, unknown>))) {
      preview.current = null
    }
  }, [run])

  const cycleTheme = useCallback(() => {
    const order: Settings['theme'][] = ['warm', 'sepia', 'dark']
    const next = order[(order.indexOf(settings.theme) + 1) % order.length]
    if (isOwner) void patchSettings({ theme: next })
    else setViewerPref({ theme: next })
  }, [settings.theme, isOwner, patchSettings, setViewerPref])

  const authorMap = useMemo(() => {
    const map = new Map<string, Author>()
    authors.forEach((a) => map.set(a.id, a))
    return map
  }, [authors])

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>()
    books.forEach((b) => map.set(b.id, b))
    return map
  }, [books])

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parent).map((c) => c.name),
    [categories],
  )

  const authorById = useCallback(
    (id: string | null) => (id ? authorMap.get(id) ?? null : null), [authorMap],
  )
  const bookById = useCallback((id: string) => bookMap.get(id), [bookMap])

  // يُحسب مرّةً لكل تبدُّلٍ في الفوائد لا في كل بطاقة: كانت كلُّ بطاقة فائدةٍ
  // تنادي `perkKindsOf` لكل نوعٍ فيها، فتمسح الفوائدَ كلَّها مرّةً لكل نوع
  const perkKindList = useMemo(
    () => perkKindsOf(perkKinds, perks, settings.perk_kinds_set),
    [perkKinds, perks, settings.perk_kinds_set],
  )
  const perkCategoryList = useMemo(
    () => perkCategoriesOf(perkCategories, settings.perk_categories_set),
    [perkCategories, settings.perk_categories_set],
  )
  // ونصوصُ البحث كذلك، يشترك فيها الكنّاشُ ولوحةُ البحث السريع
  const perkIndex = useMemo(() => buildPerkIndex(perks, bookById), [perks, bookById])
  const toggleBrowseOnly = useCallback(() => setBrowseOnly((v) => !v), [])

  // القيمةُ تُبنى مرّةً لكل تبدُّلٍ فيها لا مع كل رسم: كانت كائنًا جديدًا في
  // كل مرّة، ومعها `authorById` و`bookById` دالّتان جديدتان — فيبطل كلُّ
  // `useMemo` في الصفحات يتعلّق بهما ويُعاد حسابُه بلا سبب.
  const value = useMemo<LibraryValue>(() => ({
    loading, error, setError,
    isAuthenticated, isOwner, ownerName, hasOwnerAccount, browseOnly,
    canEdit: isOwner && !browseOnly,
    toggleBrowseOnly,
    signOut, refreshRole, roleReady,
    books, authors, works, perks, loans, publishers, categories, mainCategories,
    perksReady, wantPerks, perkIndex, perkKindList, perkCategoryList,
    perkKinds, perkCategories, perkFigures, notebooks,
    landingImages, landingQuotes, settings,
    authorById, bookById,
    reload, patchBook, patchAuthor, patchPublisher, patchSettings, cycleTheme,
    setViewerPref, previewSettings, discardPreview, saveSettings, run,
  }), [
    loading, error, isAuthenticated, isOwner, ownerName, hasOwnerAccount, browseOnly,
    toggleBrowseOnly, signOut, refreshRole, roleReady,
    books, authors, works, perks, loans, publishers, categories, mainCategories,
    perksReady, wantPerks, perkIndex, perkKindList, perkCategoryList,
    perkKinds, perkCategories, perkFigures, notebooks,
    landingImages, landingQuotes, settings, authorById, bookById,
    reload, patchBook, patchAuthor, patchPublisher, patchSettings, cycleTheme,
    setViewerPref, previewSettings, discardPreview, saveSettings, run,
  ])

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

/**
 * تطلب الصفحةُ الفوائدَ بهذا: يبدأ رصدُها إن لم يكن بدأ. ولكلّ موضعٍ يقرؤها —
 * الكنّاشُ، وصفحةُ الكتاب، ولوحةُ البحث — أن يناديه.
 */
export function useNeedPerks(): boolean {
  const { wantPerks, perksReady } = useLibrary()
  useEffect(() => { wantPerks() }, [wantPerks])
  return perksReady
}

function describe(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

