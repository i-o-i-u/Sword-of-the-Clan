// حالة المكتبة كلها في مكانٍ واحد: الدور (صاحب المكتبة أو زائر)، والبيانات،
// والإعدادات. كل تعديل يُطبَّق محليًّا أولًا ليبقى العمل سلسًا، ثم يُحفظ في
// قاعدة البيانات؛ فإن أخفق الحفظ ظهرت رسالة وأُعيد التحميل من المصدر.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import * as api from './api'
import { applyTheme } from './theme'
import {
  DEFAULT_VISIBILITY,
  type Author, type Book, type BookWork, type LandingSlide,
  type Loan, type Perk, type Settings,
} from './types'

const EMPTY_SETTINGS: Settings = {
  theme: 'warm', font: 'kitab', ui_scale: 100,
  show_status_dots: true, show_ratings: true,
  default_view: 'grid', currency: 'ريال',
  landing_title: 'مكتبة سيف العشيرة',
  landing_tagline: 'فهرسٌ حيّ لكل كتابٍ في البيت',
  landing_intro: '',
  show_landing_stats: true, show_landing_quote: true,
  auto_rotate: true, rotate_seconds: 6,
  visibility: DEFAULT_VISIBILITY,
  hidden_fields: [], hidden_categories: [], hidden_book_ids: [],
}

interface LibraryValue {
  loading: boolean
  error: string | null
  setError: (msg: string | null) => void

  // الدور
  session: Session | null
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
  shelves: string[]
  categories: string[]
  slides: LandingSlide[]
  settings: Settings

  authorById: (id: string | null) => Author | null
  bookById: (id: string) => Book | undefined

  reload: () => Promise<void>
  patchBook: (id: string, patch: api.BookInput) => Promise<void>
  patchAuthor: (id: string, patch: Partial<Author>) => Promise<void>
  patchSettings: (patch: Partial<Settings>) => Promise<void>
  /** يبدّل المظهر: يحفظه صاحبُ المكتبة، ويبقى عند الزائر تفضيلًا في متصفحه */
  cycleTheme: () => void
  run: (job: () => Promise<void>) => Promise<void>
}

const THEME_PREF_KEY = 'lib-visitor-theme'

function readThemePref(): Settings['theme'] | null {
  try {
    const v = localStorage.getItem(THEME_PREF_KEY)
    return v === 'warm' || v === 'sepia' || v === 'dark' ? v : null
  } catch { return null }
}

const LibraryContext = createContext<LibraryValue | null>(null)

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary خارج LibraryProvider')
  return ctx
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
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
  const [shelves, setShelves] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [slides, setSlides] = useState<LandingSlide[]>([])
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)

  // ---------------------------------------------------------------- الدور
  const resolveRole = useCallback(async (current: Session | null) => {
    if (!current) {
      setIsOwner(false)
      setBrowseOnly(false)
      try { setHasOwnerAccount(await api.ownerExists()) } catch { /* يبقى على حاله */ }
      return
    }
    const record = await api.fetchOwnerRecord()
    setIsOwner(!!record)
    setHasOwnerAccount(record ? true : await api.ownerExists().catch(() => true))
    if (record) setOwnerName(record.display_name || 'صاحب المكتبة')
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      await resolveRole(data.session)
      if (alive) setRoleReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      await resolveRole(next)
      setRoleReady(true)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [resolveRole])

  const refreshRole = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await resolveRole(data.session)
  }, [resolveRole])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setBrowseOnly(false)
  }, [])

  // ------------------------------------------------------------- التحميل
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [b, a, w, p, l, sh, c, sl, st] = await Promise.all([
        api.fetchBooks(isOwner),
        api.fetchAuthors(isOwner),
        api.fetchWorks(isOwner),
        api.fetchPerks(isOwner),
        api.fetchLoans(isOwner),
        api.fetchShelves(isOwner),
        api.fetchCategories(isOwner),
        api.fetchSlides(isOwner),
        api.fetchSettings(isOwner),
      ])
      setBooks(b); setAuthors(a); setWorks(w); setPerks(p); setLoans(l)
      setShelves(sh); setCategories(c); setSlides(sl)
      // الزائر قد يكون اختار مظهرًا لنفسه، فلا يُلغيه تحميلُ الإعدادات
      const pref = isOwner ? null : readThemePref()
      setSettings(pref ? { ...st, theme: pref } : st)
      setError(null)
    } catch (e) {
      setError('تعذّر تحميل بيانات المكتبة: ' + describe(e))
    } finally {
      setLoading(false)
    }
  }, [isOwner])

  useEffect(() => { if (roleReady) void reload() }, [roleReady, reload])

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

  const cycleTheme = useCallback(() => {
    const order: Settings['theme'][] = ['warm', 'sepia', 'dark']
    const next = order[(order.indexOf(settings.theme) + 1) % order.length]
    if (isOwner) {
      void patchSettings({ theme: next })
    } else {
      setSettings((prev) => ({ ...prev, theme: next }))
      try { localStorage.setItem(THEME_PREF_KEY, next) } catch { /* لا يضرّ */ }
    }
  }, [settings.theme, isOwner, patchSettings])

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

  const value: LibraryValue = {
    loading, error, setError,
    session, isOwner, ownerName, hasOwnerAccount, browseOnly,
    canEdit: isOwner && !browseOnly,
    toggleBrowseOnly: () => setBrowseOnly((v) => !v),
    signOut, refreshRole,
    books, authors, works, perks, loans, shelves, categories, slides, settings,
    authorById: (id) => (id ? authorMap.get(id) ?? null : null),
    bookById: (id) => bookMap.get(id),
    reload, patchBook, patchAuthor, patchSettings, cycleTheme, run,
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
