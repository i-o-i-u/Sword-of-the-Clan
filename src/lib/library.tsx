// حالة المكتبة كلها في مكانٍ واحد: الدور (صاحب المكتبة أو زائر)، والبيانات،
// والإعدادات. كل تعديل يُطبَّق محليًّا أولًا ليبقى العمل سلسًا، ثم يُحفظ في
// قاعدة البيانات؛ فإن أخفق الحفظ ظهرت رسالة وأُعيد التحميل من المصدر.

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
  type LandingQuote, type Loan, type Perk, type Publisher, type Settings,
} from './types'

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
  perks: Perk[]
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
  /** يحفظ الإعدادات كما هي الآن. زرّ الحفظ في النافذة هو الذي يستدعيه. */
  saveSettings: (next: Settings) => Promise<void>
  run: (job: () => Promise<void>) => Promise<void>
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

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const owner = isOwnerRef.current
      const [b, a, w, p, l, sh, c, img, q, st] = await Promise.all([
        api.fetchBooks(owner),
        api.fetchAuthors(owner),
        api.fetchWorks(owner),
        api.fetchPerks(owner),
        api.fetchLoans(owner),
        api.fetchPublishers(owner),
        api.fetchCategories(owner),
        api.fetchLandingImages(owner),
        api.fetchLandingQuotes(owner),
        api.fetchSettings(owner),
      ])
      setBooks(b); setAuthors(a); setWorks(w); setPerks(p); setLoans(l)
      setPublishers(sh); setCategories(c)
      setLandingImages(img); setLandingQuotes(q)
      // الزائر قد يكون اختار لنفسه مظهرًا وخطًّا وحجمًا، فلا يُلغيها التحميل
      serverSettings.current = st
      setSettings(withViewerPrefs(st, isOwnerRef.current))
      setError(null)
    } catch (e) {
      setError('تعذّر تحميل بيانات المكتبة: ' + describe(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // التحميل يبدأ فور استقرار الجلسة ولا ينتظر معرفة الدور: الخادم يقرّر ما
  // يُعيده بهويّة الطلب نفسها، ووسيط `owner` لا أثر له أصلًا. وانتظارُ
  // `ownerExists` قبل أول طلبٍ كان يكلّف جولةً كاملة على الشبكة بلا فائدة.
  useEffect(() => { if (!authLoading) void reload() }, [authLoading, reload])

  // أما الدخول والخروج بعد ذلك فيغيّران ما يعيده الخادم، فيُعاد التحميل.
  // واستقرارُ الدور أولَ مرة لا يُعاد له: التحميل سبقه بالفعل.
  const settledRole = useRef<boolean | null>(null)
  useEffect(() => {
    if (!roleReady) return
    if (settledRole.current === isOwner) return
    const first = settledRole.current === null
    settledRole.current = isOwner
    if (!first) void reload()
  }, [roleReady, isOwner, reload])

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
  /** ينفّذ عمليةَ حفظٍ ويعرض خطأها ويُعيد التحميل عند الإخفاق */
  const run = useCallback(async (job: () => Promise<void>) => {
    try {
      await job()
      setError(null)
    } catch (e) {
      setError('تعذّر الحفظ: ' + describe(e))
      await reload()
    }
  }, [reload])

  const patchBook = useCallback(async (id: string, patch: api.BookInput) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } as Book : b)))
    await run(() => api.updateBook(id, patch))
  }, [run])

  const patchAuthor = useCallback(async (id: string, patch: Partial<Author>) => {
    setAuthors((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    // تغيير الاسم يسري على الكتب أيضًا، ويتكفّل مُشغِّل قاعدة البيانات بحفظه
    if (patch.name !== undefined) {
      setBooks((prev) => prev.map((b) => (b.author_id === id ? { ...b, author_name: patch.name! } : b)))
    }
    await run(() => api.updateAuthor(id, patch))
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
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const saveSettings = useCallback(async (next: Settings) => {
    await run(() => api.updateSettings(next as unknown as Record<string, unknown>))
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

  const value: LibraryValue = {
    loading, error, setError,
    isAuthenticated, isOwner, ownerName, hasOwnerAccount, browseOnly,
    canEdit: isOwner && !browseOnly,
    toggleBrowseOnly: () => setBrowseOnly((v) => !v),
    signOut, refreshRole,
    books, authors, works, perks, loans, publishers, categories, mainCategories,
    landingImages, landingQuotes, settings,
    authorById: (id) => (id ? authorMap.get(id) ?? null : null),
    bookById: (id) => bookMap.get(id),
    reload, patchBook, patchAuthor, patchSettings, cycleTheme,
    setViewerPref, previewSettings, saveSettings, run,
  }

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

function describe(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

/**
 * يؤخّر حفظ الحقول النصّية الطويلة (النبذة والملاحظات والترجمة) حتى يتوقّف
 * الكاتب، فلا نُرسل طلبًا مع كل حرف.
 */
export function useDebouncedSave<T>(save: (value: T) => void, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return useCallback((value: T) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => saveRef.current(value), delay)
  }, [delay])
}
