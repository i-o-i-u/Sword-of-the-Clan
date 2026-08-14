// تصفّح المكتبة (§٥-٢): أرففٌ وتصانيف على الجانب، وثلاثة عروض للكتب:
// شبكة، وجدول، وأرفف. عرض الأرفف هو وجه هذا الفهرس: كل مجلَّدٍ ماديّ كعبٌ
// قائم، وصورة الكعب المرفوعة هي ما يجعل الرف يشبه رفّ البيت.
//
// وأدوات الصفحة ثلاثٌ لا تختلط: طرق العرض أزرارٌ بأيقوناتها، والترتيب قائمة،
// والتصفيات لوحةٌ تُفتح — كي لا يزدحم الشريط بما لا يُستعمل في كل زيارة.

import { Suspense, lazy, useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { deathLabel, toHijriYear } from '../lib/hijri'
import {
  ALL_SEARCH_KEYS, DEFAULT_SEARCH_KEYS, QUICK_OPTS, SEARCH_FIELDS,
  matchBook, type SearchOptions,
} from '../lib/search'
import {
  ARABIC_LETTERS, CATEGORY_SPINE, SORT_OPTIONS, STATUSES, STATUS_DOT, VIEW_OPTIONS,
  STATUS_UNKNOWN,
  centuryName, contributorLabel, formatNumber, parseNumber, titleInitial,
  type Book, type SortKey, type ViewMode, volumesOf,
} from '../lib/types'
import ImageSlot from '../components/ImageSlot'
import {
  CabinetIcon, CalculatorIcon, ChartIcon, EmptyState, FilterIcon, GridIcon,
  HashIcon, HourglassIcon, OpenBookIcon, OwnerIcon, PagesIcon, PressIcon,
  SearchIcon, ShelfIcon, Stars, SuggestIcon, TableIcon, TagIcon,
  ToggleRow, VerifyIcon, VolumesIcon,
  cardStyle, chipStyle, countPillStyle, facetStyle, viewToggleStyle,
} from '../components/ui'

// الحاسبة خدمةٌ تُفتح عند طلبها، فلا تُحمَّل مع الصفحة
const ReadingCalculator = lazy(() => import('../components/ReadingCalculator'))

const ALL = 'الكل'
/** قيمةٌ فارقة لوجه «الحالة غير معروفة»، فالفراغ نفسه لا يصلح قيمةً لخيار */
const UNKNOWN_STATUS = '__unknown__'

const SEARCH_TOGGLES: { key: keyof SearchOptions; label: string; hint: string }[] = [
  { key: 'caseSensitive', label: 'حساسية حالة الأحرف',            hint: 'يُفرِّق بين A و a في اللغات اللاتينية' },
  { key: 'respectHamza',  label: 'مراعاة الهمزات والتاء المربوطة', hint: 'حين يُطفأ: «اسلام» تجد «إسلام»' },
  { key: 'exact',         label: 'التطابق التام',                  hint: 'أن يكون الحقل مساويًا للنص كاملًا' },
  { key: 'anyOrder',      label: 'البحث بكلمات غير متتالية',        hint: 'تُطابَق الكلمات بأي ترتيب' },
]

/** أيقونة كل طريقة عرض. الأسماء في `VIEW_OPTIONS` كما هي. */
const VIEW_ICONS: Record<ViewMode, (p: { size?: number }) => JSX.Element> = {
  table: TableIcon,
  grid: GridIcon,
  shelf: ShelfIcon,
}

export default function Browse() {
  const { books, authorById, categories, settings, isOwner } = useLibrary()

  const [filterCabinet, setFilterCabinet] = useState(ALL)
  const [filterCategory, setFilterCategory] = useState(ALL)
  const [filterStatus, setFilterStatus] = useState(ALL)
  const [filterPlace, setFilterPlace] = useState(ALL)
  const [filterRating, setFilterRating] = useState(0)
  const [filterCentury, setFilterCentury] = useState(0)
  const [filterLetter, setFilterLetter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('authorDeath')
  const [viewMode, setViewMode] = useState<ViewMode>(settings.default_view)

  const [showCalculator, setShowCalculator] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [opts, setOpts] = useState<SearchOptions>({
    caseSensitive: false, respectHamza: false, exact: false, anyOrder: true,
  })
  const [fields, setFields] = useState<string[]>(DEFAULT_SEARCH_KEYS)

  const canUseAdvanced = isOwner || settings.visibility.advSearch
  const advancedOn = advanced && canUseAdvanced
  const canSeeStats = isOwner || settings.visibility.stats

  const searchOpts = advancedOn ? opts : QUICK_OPTS
  const searchKeys = advancedOn ? fields : ALL_SEARCH_KEYS

  // ------------------------------------------------------------ المرشِّحات
  /** قرن وفاة صاحب الكتاب، هجريًّا. صفرٌ لمن لا وفاة له. */
  const centuryOf = useMemo(() => (b: Book) => {
    const a = authorById(b.author_id)
    const y = a ? toHijriYear(a.death, a.era) : null
    return y == null || y <= 0 ? 0 : Math.ceil(y / 100)
  }, [authorById])

  const passCabinet = (b: Book) => filterCabinet === ALL || b.cabinet_no === filterCabinet
  const passCategory = (b: Book) => filterCategory === ALL || b.category === filterCategory
  const passStatus = (b: Book) => filterStatus === ALL
    || (filterStatus === UNKNOWN_STATUS ? !b.status : b.status === filterStatus)
  const passPlace = (b: Book) => filterPlace === ALL || b.place.trim() === filterPlace
  const passRating = (b: Book) => filterRating === 0 || b.rating >= filterRating
  const passCentury = (b: Book) => filterCentury === 0 || centuryOf(b) === filterCentury
  const passLetter = (b: Book) => !filterLetter || titleInitial(b.title) === filterLetter
  const passSearch = (b: Book) => matchBook(b, query.trim(), searchOpts, searchKeys)

  /** كل المرشِّحات، ويجوز استثناء واحدٍ منها لحساب عدّاد وجهه */
  const passes = (b: Book, except?: 'cabinet' | 'category') =>
    (except === 'cabinet' || passCabinet(b))
    && (except === 'category' || passCategory(b))
    && passStatus(b) && passPlace(b) && passRating(b) && passCentury(b)
    && passLetter(b) && passSearch(b)

  const sorter = useMemo(() => {
    const deathKey = (b: Book) => {
      const a = authorById(b.author_id)
      const v = a ? toHijriYear(a.death, a.era) : null
      return v == null ? 1e9 : v
    }
    const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, 'ar')
    const sorters: Record<SortKey, (a: Book, b: Book) => number> = {
      authorDeath: (a, b) => (deathKey(a) - deathKey(b)) || byTitle(a, b),
      title: byTitle,
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
      rating: (a, b) => b.rating - a.rating,
      volumes: (a, b) => (b.volumes ?? 0) - (a.volumes ?? 0),
      pages: (a, b) => (b.pages ?? 0) - (a.pages ?? 0),
      value: (a, b) => (b.value ?? 0) - (a.value ?? 0),
    }
    return sorters[sortBy] ?? byTitle
  }, [sortBy, authorById])

  const filtered = useMemo(
    () => books.filter((b) => passes(b)).sort(sorter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, filterCabinet, filterCategory, filterStatus, filterPlace, filterRating,
      filterCentury, filterLetter, query, searchOpts, searchKeys, sorter],
  )

  // دواليب المكتبة تُشتقّ من الكتب نفسها: ما من قائمةٍ تُدار على حِدَة، فرقمُ
  // الدولاب يُكتب مع كل كتاب. وترتيبها عدديٌّ لا أبجديّ.
  const cabinets = useMemo(() => {
    const found = new Set(books.map((b) => b.cabinet_no.trim()).filter(Boolean))
    return [...found].sort((a, b) => {
      const na = parseNumber(a)
      const nb = parseNumber(b)
      if (na !== null && nb !== null) return na - nb
      return a.localeCompare(b, 'ar')
    })
  }, [books])

  // بلدان النشر ومئات الوفيات كلاهما مشتقٌّ من الكتب، فلا جدول لواحدٍ منهما
  const places = useMemo(
    () => [...new Set(books.map((b) => b.place.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ar')),
    [books],
  )

  const centuries = useMemo(
    () => [...new Set(books.map(centuryOf).filter((c) => c > 0))].sort((a, b) => a - b),
    [books, centuryOf],
  )

  /** الحروف التي في المكتبة كتبٌ تبدأ بها، فلا يُعرض حرفٌ لا يقود إلى شيء */
  const liveLetters = useMemo(
    () => new Set(books.map((b) => titleInitial(b.title)).filter(Boolean)),
    [books],
  )

  // عدّاد كل وجهٍ يُحسب مقابل بقية المرشِّحات النشطة، لا مقابل الكل
  const cabinetFacets = useMemo(
    () => [ALL, ...cabinets].map((name) => ({
      name,
      label: name === ALL ? 'كل الدواليب' : `دولاب ${name}`,
      count: books.filter((b) => (name === ALL || b.cabinet_no === name) && passes(b, 'cabinet')).length,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, cabinets, filterCategory, filterStatus, filterPlace, filterRating,
      filterCentury, filterLetter, query, searchOpts, searchKeys],
  )

  const categoryFacets = useMemo(
    () => [ALL, ...categories].map((name) => ({
      name,
      label: name === ALL ? 'كل التصنيفات' : name,
      count: books.filter((b) => (name === ALL || b.category === name) && passes(b, 'category')).length,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, categories, filterCabinet, filterStatus, filterPlace, filterRating,
      filterCentury, filterLetter, query, searchOpts, searchKeys],
  )

  /** كتابٌ يُنتقى بالقرعة، والانتقال إلى صفحته مباشرة */
  function suggestBook() {
    if (!books.length) return
    const pick = books[Math.floor(Math.random() * books.length)]
    navigate({ name: 'book', id: pick.id })
  }

  const activeFilters = (filterPlace !== ALL ? 1 : 0) + (filterRating ? 1 : 0)
    + (filterCentury ? 1 : 0) + (filterCategory !== ALL ? 1 : 0)

  function clearFilters() {
    setFilterCategory(ALL); setFilterPlace(ALL); setFilterRating(0); setFilterCentury(0)
  }

  const activeLabel = filterCabinet !== ALL
    ? `دولاب ${filterCabinet}`
    : (filterCategory !== ALL ? filterCategory : null)
  const readingCount = books.filter((b) => b.status === 'قيد القراءة').length
  const trimmed = query.trim()

  return (
    <main
      className="app-main browse-layout"
      style={{
        maxWidth: 1320, margin: '0 auto', padding: 32,
        display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start',
      }}
    >
      <aside
        className="browse-sidebar"
        style={{ ...cardStyle, borderRadius: 14, padding: 18, position: 'sticky', top: 90 }}
      >
        <div style={{ fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          تصفّح المكتبة
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>دواليب المكتبة</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          {cabinetFacets.map((f) => (
            <button key={f.name} type="button" onClick={() => setFilterCabinet(f.name)} style={facetStyle(filterCabinet === f.name)}>
              <span>{f.label}</span>
              <span style={countPillStyle(filterCabinet === f.name)}>{f.count}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>التصنيفات</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          {categoryFacets.map((f) => (
            <button key={f.name} type="button" onClick={() => setFilterCategory(f.name)} style={facetStyle(filterCategory === f.name)}>
              <span>{f.label}</span>
              <span style={countPillStyle(filterCategory === f.name)}>{f.count}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
            حالة القراءة (اختياري)
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--bg)', fontSize: 12, color: 'var(--muted)',
              }}
            >
              {[ALL, ...STATUSES].map((s) => <option key={s} value={s}>{s}</option>)}
              {/* الحالةُ المرفوعة وجهٌ كغيره، فيُبحث عنها كما يُبحث عن سواها */}
              <option value={UNKNOWN_STATUS}>{STATUS_UNKNOWN}</option>
            </select>
          </label>
        </div>
      </aside>

      {/* لولا min-width:0 لتمدّد الجدولُ والرفُّ القابلان للتمرير فكسرا الشبكة */}
      <div style={{ minWidth: 0 }}>
        <section className="browse-head" style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 22, gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 30, margin: 0, fontWeight: 700 }}>
              {activeLabel ?? 'فِهْرِس المكتبة'}
            </h1>
            {trimmed && (
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
                {`نتائج البحث عن "${trimmed}" — ${formatNumber(filtered.length)} كتاب`}
              </p>
            )}
          </div>

          {/* عدّاد المكتبة لوحٌ مزخرف، وخدمتاه إلى جانبه لا داخل شريط الأدوات */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, flexWrap: 'wrap' }}>
            <div className="total-box">
              <span className="total-box-label">إجْماليّ الكُتُب</span>
              <strong className="total-box-value">{formatNumber(books.length)}</strong>
              {readingCount > 0 && (
                <span className="total-box-sub">{formatNumber(readingCount)} قيد القراءة</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="side-tool"
              title="حاسبة القراءة"
            >
              <CalculatorIcon size={19} />
              <span>حاسبة القراءة</span>
            </button>

            {canSeeStats && (
              <button
                type="button"
                onClick={() => navigate({ name: 'stats' })}
                className="side-tool"
                title="إحصائيّات المكتبة"
              >
                <ChartIcon size={19} />
                <span>إحصائيّات المكتبة</span>
              </button>
            )}
          </div>
        </section>

        <section style={{ ...cardStyle, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          {/* أزرار الصفحة فوق شريط البحث: العرض، والترتيب، والتصفيات، والقرعة */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)',
          }}>
            {/* طرق العرض أزرارٌ منفصلة بأيقوناتها: الثلاثةُ مرئيّةٌ معًا،
                فيُعرف الموجودُ منها والمختار بنظرة. */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--header)', borderRadius: 10, padding: 3 }}>
              {VIEW_OPTIONS.map((o) => {
                const Icon = VIEW_ICONS[o.key]
                const on = viewMode === o.key
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setViewMode(o.key)}
                    title={o.label}
                    aria-label={o.label}
                    aria-pressed={on}
                    style={{
                      ...viewToggleStyle(on),
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
                    }}
                  >
                    <Icon size={16} />
                    <span className="view-btn-name">{viewName(o.label)}</span>
                  </button>
                )
              })}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="طريقة الترتيب"
              style={toolStyle}
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              style={{
                ...toolStyle, display: 'inline-flex', alignItems: 'center', gap: 7,
                borderColor: activeFilters ? 'var(--accent)' : 'var(--border)',
                color: activeFilters ? 'var(--accent)' : 'var(--text)',
              }}
            >
              <FilterIcon size={15} />
              التصفيات
              {activeFilters > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 999,
                  fontSize: 10.5, fontWeight: 700, padding: '0 6px', lineHeight: '16px',
                }}>
                  {activeFilters}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={suggestBook}
              disabled={books.length === 0}
              title={books.length === 0 ? 'لا كتب في الفهرس بعد' : 'اقترح لي كتابًا — بالقرعة'}
              style={{ ...toolStyle, opacity: books.length === 0 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <SuggestIcon size={16} />
              اقترح لي كتابًا
            </button>
          </div>

          {showFilters && (
            <FiltersPanel
              categories={categories}
              places={places}
              centuries={centuries}
              category={filterCategory} onCategory={setFilterCategory}
              place={filterPlace} onPlace={setFilterPlace}
              rating={filterRating} onRating={setFilterRating}
              century={filterCentury} onCentury={setFilterCentury}
              activeCount={activeFilters}
              onClear={clearFilters}
            />
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', right: 13, display: 'flex', color: 'var(--muted)', pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في المكتبة: عنوان، مؤلف، محقق، ناشر، وسم…"
                aria-label="ابحث في المكتبة"
                style={{
                  width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  fontSize: 14.5, color: 'var(--text)',
                }}
              />
            </div>

            {canUseAdvanced && (
              <div style={{ display: 'flex', gap: 4, background: 'var(--header)', borderRadius: 9, padding: 3 }}>
                <button type="button" onClick={() => setAdvanced(false)} style={viewToggleStyle(!advancedOn)}>بحث سريع</button>
                <button type="button" onClick={() => setAdvanced(true)} style={viewToggleStyle(advancedOn)}>بحث متقدّم</button>
              </div>
            )}

            {trimmed && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
                  borderRadius: 9, padding: '8px 14px', fontSize: 12.5,
                }}
              >
                مسح
              </button>
            )}
          </div>

          {/* شريط حروف الهجاء: يقصُر العرض على ما ابتدأ عنوانُه بالحرف،
              و«ال» التعريف مطروحةٌ كما يصنع الفهارسة. */}
          <LetterBar
            value={filterLetter}
            onChange={setFilterLetter}
            live={liveLetters}
          />

          {advancedOn && (
            <div
              className="form-row"
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
                gap: '18px 28px', borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>خصائص المطابقة</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SEARCH_TOGGLES.map((t) => (
                    <ToggleRow
                      key={t.key}
                      label={t.label}
                      hint={t.hint}
                      on={opts[t.key]}
                      onChange={() => setOpts((o) => ({ ...o, [t.key]: !o[t.key] }))}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>الحقول التي يُبحَث فيها</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SEARCH_FIELDS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFields((prev) => {
                        const has = prev.includes(f.key)
                        // لا بدّ من بقاء حقلٍ واحدٍ على الأقل
                        if (has && prev.length === 1) return prev
                        return has ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                      })}
                      style={chipStyle(fields.includes(f.key))}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                  البحث السريع يشمل جميع الحقول ويتجاهل الهمزات والتشكيل.
                </div>
              </div>
            </div>
          )}
        </section>

        {filtered.length === 0 ? (
          <EmptyState title="لا توجد كتب مطابقة" hint="جرّب تعديل الفلاتر أو كلمة البحث" />
        ) : viewMode === 'grid' ? (
          <GridView books={filtered} />
        ) : viewMode === 'table' ? (
          <TableView books={filtered} />
        ) : (
          <ShelfView books={filtered} cabinets={filterCabinet === ALL ? cabinets : [filterCabinet]} />
        )}
      </div>

      <Suspense fallback={null}>
        {showCalculator && <ReadingCalculator onClose={() => setShowCalculator(false)} />}
      </Suspense>
    </main>
  )
}

const toolStyle = {
  padding: '8px 13px', borderRadius: 9, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
} as const

/** «عرض في صورة شبكة» ← «شبكة»: الأيقونة تكفي، والاسم تذكيرٌ لا شرح */
function viewName(label: string): string {
  return label.replace(/^عرض في صورة\s*/, '')
}

// ---------------------------------------------------------- لوحة التصفيات
function FiltersPanel(
  { categories, places, centuries, category, onCategory, place, onPlace,
    rating, onRating, century, onCentury, activeCount, onClear }: {
    categories: string[]
    places: string[]
    centuries: number[]
    category: string
    onCategory: (v: string) => void
    place: string
    onPlace: (v: string) => void
    rating: number
    onRating: (v: number) => void
    century: number
    onCentury: (v: number) => void
    activeCount: number
    onClear: () => void
  },
) {
  return (
    <div style={{
      borderBottom: '1px solid var(--border)', marginBottom: 12, paddingBottom: 14,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <FilterRow label="التصنيفات" icon={<TagIcon size={13} />}>
        <button type="button" onClick={() => onCategory(ALL)} style={chipStyle(category === ALL)}>الكل</button>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => onCategory(c)} style={chipStyle(category === c)}>{c}</button>
        ))}
      </FilterRow>

      <FilterRow label="بلدان النشر" icon={<PressIcon size={13} />}>
        <button type="button" onClick={() => onPlace(ALL)} style={chipStyle(place === ALL)}>الكل</button>
        {places.length === 0
          ? <span style={emptyNote}>لم يُسجَّل بلدُ نشرٍ بعد</span>
          : places.map((p) => (
            <button key={p} type="button" onClick={() => onPlace(p)} style={chipStyle(place === p)}>{p}</button>
          ))}
      </FilterRow>

      <FilterRow label="التقييم" icon={<span style={{ color: 'var(--star)' }}>★</span>}>
        <button type="button" onClick={() => onRating(0)} style={chipStyle(rating === 0)}>الكل</button>
        {[5, 4, 3, 2, 1].map((n) => (
          <button key={n} type="button" onClick={() => onRating(n)} style={chipStyle(rating === n)}>
            {'★'.repeat(n)}{n < 5 && ' فأعلى'}
          </button>
        ))}
      </FilterRow>

      <FilterRow label="قرن وفاة المؤلِّف" icon={<HourglassIcon size={13} />}>
        <button type="button" onClick={() => onCentury(0)} style={chipStyle(century === 0)}>الكل</button>
        {centuries.length === 0
          ? <span style={emptyNote}>لم تُسجَّل وفاةُ مؤلِّفٍ بعد</span>
          : centuries.map((c) => (
            <button key={c} type="button" onClick={() => onCentury(c)} style={chipStyle(century === c)}>
              {centuryName(c)}
            </button>
          ))}
      </FilterRow>

      {activeCount > 0 && (
        <div>
          <button
            type="button"
            onClick={onClear}
            style={{
              border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
              borderRadius: 8, padding: '6px 13px', fontSize: 12,
            }}
          >
            رفعُ التصفيات كلِّها
          </button>
        </div>
      )}
    </div>
  )
}

const emptyNote = { fontSize: 12, color: 'var(--muted)' } as const

function FilterRow(
  { label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode },
) {
  return (
    <div className="filter-row" style={{ display: 'grid', gridTemplateColumns: '132px minmax(0,1fr)', gap: 12, alignItems: 'baseline' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'var(--muted)', fontWeight: 600,
      }}>
        {icon}
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</div>
    </div>
  )
}

// -------------------------------------------------------- شريط حروف الهجاء
function LetterBar(
  { value, onChange, live }: { value: string; onChange: (v: string) => void; live: Set<string> },
) {
  return (
    <div className="letter-bar" style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => onChange('')}
        style={letterStyle(value === '', true)}
        title="كل الحروف"
      >
        الكل
      </button>
      {ARABIC_LETTERS.map((letter) => {
        const has = live.has(letter)
        return (
          <button
            key={letter}
            type="button"
            disabled={!has}
            onClick={() => onChange(value === letter ? '' : letter)}
            title={has ? `الكتب المبدوءة بحرف ${letter}` : `لا كتاب يبدأ بحرف ${letter}`}
            style={{ ...letterStyle(value === letter, has), opacity: has ? 1 : 0.34 }}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}

const letterStyle = (on: boolean, live: boolean) => ({
  minWidth: 30, height: 30, padding: '0 7px', borderRadius: 7, fontSize: 13.5,
  fontFamily: 'var(--heading-font)', fontWeight: on ? 700 : 400,
  border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
  background: on ? 'var(--accent)' : 'var(--bg)',
  color: on ? 'var(--on-accent)' : 'var(--text)',
  cursor: live ? 'pointer' : 'default',
} as const)

// ------------------------------------------------------------------ شبكة
function GridView({ books }: { books: Book[] }) {
  const { settings, authorById } = useLibrary()
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 20 }}>
      {books.map((book) => {
        const author = authorById(book.author_id)
        const death = deathLabel(author)
        // أوّل من عمل في الكتاب غير مؤلِّفه، بصفته — والبقيّة في بطاقته
        const first = (book.contributors ?? []).find((c) => c.name.trim())

        return (
          <div
            key={book.id}
            className="book-card"
            onClick={() => navigate({ name: 'book', id: book.id })}
            style={{ ...cardStyle, cursor: 'pointer', borderRadius: 12, overflow: 'hidden' }}
          >
            <div style={{ width: '100%', aspectRatio: '3/4', position: 'relative', background: 'var(--cover-bg)' }}>
              <ImageSlot url={book.cover_url} folder="covers" canEdit={false} onUploaded={() => {}} placeholder="غلاف الكتاب" />
              {settings.show_status_dots && book.status && (
                <span style={{
                  position: 'absolute', bottom: 8, left: 8, width: 9, height: 9, borderRadius: '50%',
                  background: STATUS_DOT[book.status] ?? 'var(--muted)',
                  boxShadow: '0 0 0 2px oklch(0.98 0.01 75 / 0.8)',
                }} />
              )}
            </div>
            <div style={{ padding: '11px 13px 13px' }}>
              <div style={{
                fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 15, lineHeight: 1.35,
                marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {book.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 9 }}>
                <CardLine icon={<OwnerIcon size={13} />} text={book.author_name} strong />
                {death && <CardLine icon={<HourglassIcon size={12} />} text={death} />}
                {first && (
                  <CardLine
                    icon={<VerifyIcon size={12} />}
                    text={`${contributorLabel(first.role, 1)}: ${first.name.trim()}`}
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  {book.category ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, color: 'var(--muted)', background: 'var(--header)',
                      padding: '2px 8px', borderRadius: 6, minWidth: 0,
                    }}>
                      <TagIcon size={11} />
                      <span style={clipped}>{book.category}</span>
                    </span>
                  ) : <span />}
                  {settings.show_ratings && <Stars rating={book.rating} />}
                </div>

                {book.cabinet_no && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'var(--muted)',
                  }}>
                    <CabinetIcon size={11} />
                    دولاب {book.cabinet_no}{book.shelf_no && ` / رفّ ${book.shelf_no}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}

const clipped = {
  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
} as const

/** سطرٌ في بطاقة الشبكة: أيقونةٌ ثم نصٌّ يُقصّ عند الضيق */
function CardLine({ icon, text, strong }: { icon: React.ReactNode; text: string; strong?: boolean }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
      fontSize: strong ? 12.5 : 11.5,
      color: strong ? 'var(--text)' : 'var(--muted)',
      fontWeight: strong ? 600 : 400,
    }}>
      <span style={{ display: 'flex', flex: 'none', color: 'var(--muted)' }}>{icon}</span>
      <span style={clipped}>{text}</span>
    </span>
  )
}

// ------------------------------------------------------------------ جدول
/** أعمدة الجدول وأيقونة كلٍّ منها، بترتيبها المعتمد */
const TABLE_HEADS: { label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { label: 'مُسلسل',           icon: HashIcon },
  { label: 'عنوان الكتاب',     icon: OpenBookIcon },
  { label: 'المُؤلِّف',          icon: OwnerIcon },
  { label: 'تاريخ وفاته',      icon: HourglassIcon },
  { label: 'الناشر',           icon: PressIcon },
  { label: 'المُجلَّدات',        icon: VolumesIcon },
  { label: 'إجماليّ الصفحات',  icon: PagesIcon },
  { label: 'دولاب / رفّ',       icon: CabinetIcon },
]

const TABLE_COLUMNS = '62px minmax(0,2.4fr) minmax(0,1.7fr) 104px minmax(0,1.4fr) 84px 104px 116px'

function TableView({ books }: { books: Book[] }) {
  const { authorById } = useLibrary()
  const cell = { padding: '11px 10px', fontSize: 12.5, color: 'var(--muted)' } as const

  return (
    <section style={{ ...cardStyle, borderRadius: 14, overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
      {/* الترويسة والصفوف تتقاسمان العرض الأدنى نفسه لتبقى الأعمدة متحاذية */}
      <div style={{
        minWidth: 940, display: 'grid', gridTemplateColumns: TABLE_COLUMNS,
        background: 'var(--header)', fontSize: 12, color: 'var(--muted)', fontWeight: 700, padding: '0 6px',
      }}>
        {TABLE_HEADS.map(({ label, icon: Icon }) => (
          <div key={label} style={{ padding: '11px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={13} />
            <span style={clipped}>{label}</span>
          </div>
        ))}
      </div>

      {books.map((book, i) => {
        const author = authorById(book.author_id)
        return (
          <div
            key={book.id}
            className="row-hover"
            onClick={() => navigate({ name: 'book', id: book.id })}
            style={{
              minWidth: 940, display: 'grid', gridTemplateColumns: TABLE_COLUMNS,
              alignItems: 'center', cursor: 'pointer', padding: '0 6px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(i + 1)}</div>
            <div style={{ padding: '11px 10px', fontFamily: 'var(--heading-font)', fontSize: 14.5, fontWeight: 700, ...clipped }}>
              {book.title}
            </div>
            <div style={{ padding: '11px 10px', fontSize: 13, ...clipped }}>{book.author_name || '—'}</div>
            <div style={{ ...cell, ...clipped }}>{deathLabel(author) || '—'}</div>
            <div style={{ ...cell, ...clipped }}>{book.publisher || '—'}</div>
            <div style={cell}>{formatNumber(volumesOf(book))}</div>
            <div style={cell}>{book.pages ? formatNumber(book.pages) : '—'}</div>
            <div style={{ ...cell, ...clipped }}>
              {book.cabinet_no
                ? `${book.cabinet_no}${book.shelf_no ? ` / ${book.shelf_no}` : ''}`
                : '—'}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ------------------------------------------------------------------ أرفف
function ShelfView({ books, cabinets }: { books: Book[]; cabinets: string[] }) {
  // ما لم يُكتب له دولاب يُعرض في رفٍّ أخيرٍ لا يُهمَل
  const placed = new Set(cabinets)
  const sections = [...cabinets, '']
    .map((cabinet) => ({
      cabinet,
      roomBooks: books.filter((b) =>
        cabinet ? b.cabinet_no === cabinet : !placed.has(b.cabinet_no.trim())),
    }))
    .filter((s) => s.roomBooks.length > 0)

  if (sections.length === 0) {
    return <EmptyState title="لا توجد كتب مطابقة" hint="جرّب تعديل الفلاتر أو كلمة البحث" />
  }

  return (
    <>
      {sections.map(({ cabinet, roomBooks }) => {
        const spineCount = roomBooks.reduce((sum, b) => sum + volumesOf(b), 0)
        return (
          <div key={cabinet || 'بلا دولاب'} style={{ marginBottom: 34 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--heading-font)', fontSize: 19, fontWeight: 700 }}>
                {cabinet ? `دولاب ${cabinet}` : 'كتبٌ بلا موضع'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {formatNumber(roomBooks.length)} كتاب — {formatNumber(spineCount)} مجلَّد على الرف
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(180deg, oklch(0.93 0.02 65) 0%, oklch(0.9 0.02 65) 82%, oklch(0.42 0.09 45) 82%, oklch(0.32 0.08 40) 100%)',
              borderRadius: 10, padding: '24px 20px 0', display: 'flex', alignItems: 'flex-end',
              gap: 3, overflowX: 'auto', boxShadow: 'inset 0 0 0 1px var(--border)',
            }}>
              {roomBooks.flatMap((book) => {
                const count = volumesOf(book)
                // كعبٌ واحدٌ للكتاب كلِّه، يُكرَّر على مجلَّداته ويُميَّز كلٌّ
                // منها برقمه. والمفتاح «1»، وما قبله من كعوبٍ لكل مجلَّد
                // يبقى مقروءًا لئلّا يضيع ما رُفع من قبل.
                const spineUrl = book.spine_images?.['1']
                const useImage = book.use_spine
                const width = useImage ? 34 : 32 + (book.title.length % 4) * 4
                const height = Math.round(Math.min(238, Math.max(152, 152 + ((book.pages ?? 200) / 1200) * 86)))

                return Array.from({ length: count }, (_, i) => {
                  const volume = i + 1
                  const url = spineUrl ?? book.spine_images?.[String(volume)]
                  return (
                    <div
                      key={`${book.id}-${volume}`}
                      className="spine"
                      onClick={() => navigate({ name: 'book', id: book.id })}
                      title={count > 1 ? `${book.title} — المجلد ${volume}` : book.title}
                      style={{
                        cursor: 'pointer', flex: 'none', position: 'relative',
                        width, height, borderRadius: '2px 2px 0 0', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: useImage
                          ? 'var(--cover-bg)'
                          : (CATEGORY_SPINE[book.category] ?? 'var(--accent)'),
                        boxShadow: 'inset 1px 0 0 oklch(0 0 0 / 0.1)',
                      }}
                    >
                      {useImage && url ? (
                        <ImageSlot url={url} folder="spines" canEdit={false} onUploaded={() => {}} placeholder="كعب" />
                      ) : (
                        <span style={{
                          writingMode: 'vertical-rl', textOrientation: 'mixed',
                          fontFamily: "'Amiri', serif", fontSize: 12.5, fontWeight: 700,
                          color: 'oklch(0.98 0.01 75)', maxHeight: '100%', overflow: 'hidden',
                          whiteSpace: 'nowrap', padding: '14px 0',
                        }}>
                          {book.title}
                        </span>
                      )}

                      {/* رقمُ المجلَّد في دائرة: به تُميَّز الكعوب المتشابهة */}
                      {count > 1 && (
                        <span style={{
                          position: 'absolute', top: 5, right: '50%', transform: 'translateX(50%)',
                          width: 17, height: 17, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, lineHeight: 1,
                          background: 'oklch(0.98 0.01 75 / 0.94)', color: 'oklch(0.28 0.03 45)',
                          boxShadow: '0 1px 3px oklch(0.2 0.02 50 / 0.35)',
                        }}>
                          {volume}
                        </span>
                      )}

                      {book.status && (
                        <span style={{
                          position: 'absolute', bottom: 5, right: '50%', transform: 'translateX(50%)',
                          width: 6, height: 6, borderRadius: '50%',
                          background: STATUS_DOT[book.status] ?? 'var(--muted)',
                          boxShadow: '0 0 0 1.5px oklch(0.98 0.01 75 / 0.55)',
                        }} />
                      )}
                    </div>
                  )
                })
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
