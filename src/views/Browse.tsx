// تصفّح المكتبة (§٥-٢): أرففٌ وتصانيف على الجانب، وثلاثة عروض للكتب:
// شبكة، وجدول، وأرفف. عرض الأرفف هو وجه هذا الفهرس: كل مجلَّدٍ ماديّ كعبٌ
// قائم، وصورة الكعب المرفوعة هي ما يجعل الرف يشبه رفّ البيت.

import { useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { toHijriYear, yearLabel } from '../lib/hijri'
import {
  ALL_SEARCH_KEYS, DEFAULT_SEARCH_KEYS, QUICK_OPTS, SEARCH_FIELDS,
  matchBook, type SearchOptions,
} from '../lib/search'
import {
  CATEGORY_SPINE, SORT_OPTIONS, STATUSES, STATUS_DOT,
  type Book, type SortKey, type ViewMode, volumesOf,
} from '../lib/types'
import ImageSlot from '../components/ImageSlot'
import {
  EmptyState, SearchIcon, StatusBadge, Stars, ToggleRow,
  cardStyle, chipStyle, countPillStyle, facetStyle, viewToggleStyle,
} from '../components/ui'

const ALL = 'الكل'

const SEARCH_TOGGLES: { key: keyof SearchOptions; label: string; hint: string }[] = [
  { key: 'caseSensitive', label: 'حساسية حالة الأحرف',            hint: 'يُفرِّق بين A و a في اللغات اللاتينية' },
  { key: 'respectHamza',  label: 'مراعاة الهمزات والتاء المربوطة', hint: 'حين يُطفأ: «اسلام» تجد «إسلام»' },
  { key: 'exact',         label: 'التطابق التام',                  hint: 'أن يكون الحقل مساويًا للنص كاملًا' },
  { key: 'anyOrder',      label: 'البحث بكلمات غير متتالية',        hint: 'تُطابَق الكلمات بأي ترتيب' },
]

export default function Browse() {
  const { books, authorById, shelves, categories, settings, isOwner } = useLibrary()

  const [filterRoom, setFilterRoom] = useState(ALL)
  const [filterCategory, setFilterCategory] = useState(ALL)
  const [filterStatus, setFilterStatus] = useState(ALL)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('authorDeath')
  const [viewMode, setViewMode] = useState<ViewMode>(settings.default_view)

  const [advanced, setAdvanced] = useState(false)
  const [opts, setOpts] = useState<SearchOptions>({
    caseSensitive: false, respectHamza: false, exact: false, anyOrder: true,
  })
  const [fields, setFields] = useState<string[]>(DEFAULT_SEARCH_KEYS)

  const canUseAdvanced = isOwner || settings.visibility.advSearch
  const advancedOn = advanced && canUseAdvanced

  const searchOpts = advancedOn ? opts : QUICK_OPTS
  const searchKeys = advancedOn ? fields : ALL_SEARCH_KEYS

  // ------------------------------------------------------------ المرشِّحات
  const passRoom = (b: Book) => filterRoom === ALL || b.room === filterRoom
  const passCategory = (b: Book) => filterCategory === ALL || b.category === filterCategory
  const passStatus = (b: Book) => filterStatus === ALL || b.status === filterStatus
  const passSearch = (b: Book) => matchBook(b, query.trim(), searchOpts, searchKeys)

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
      author: (a, b) => a.author_name.localeCompare(b.author_name, 'ar'),
      year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
      rating: (a, b) => b.rating - a.rating,
      pages: (a, b) => (b.pages ?? 0) - (a.pages ?? 0),
      value: (a, b) => (b.value ?? 0) - (a.value ?? 0),
    }
    return sorters[sortBy] ?? byTitle
  }, [sortBy, authorById])

  const filtered = useMemo(
    () => books.filter((b) => passRoom(b) && passCategory(b) && passStatus(b) && passSearch(b)).sort(sorter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, filterRoom, filterCategory, filterStatus, query, searchOpts, searchKeys, sorter],
  )

  // عدّاد كل وجهٍ يُحسب مقابل بقية المرشِّحات النشطة، لا مقابل الكل
  const roomFacets = useMemo(
    () => [ALL, ...shelves].map((name) => ({
      name,
      label: name === ALL ? 'كل الأرفف' : name,
      count: books.filter((b) =>
        (name === ALL || b.room === name) && passCategory(b) && passStatus(b) && passSearch(b)).length,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, shelves, filterCategory, filterStatus, query, searchOpts, searchKeys],
  )

  const categoryFacets = useMemo(
    () => [ALL, ...categories].map((name) => ({
      name,
      label: name === ALL ? 'كل التصنيفات' : name,
      count: books.filter((b) =>
        (name === ALL || b.category === name) && passRoom(b) && passStatus(b) && passSearch(b)).length,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, categories, filterRoom, filterStatus, query, searchOpts, searchKeys],
  )

  const activeLabel = filterRoom !== ALL ? filterRoom : (filterCategory !== ALL ? filterCategory : null)
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

        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>أرفف المكتبة</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          {roomFacets.map((f) => (
            <button key={f.name} type="button" onClick={() => setFilterRoom(f.name)} style={facetStyle(filterRoom === f.name)}>
              <span>{f.label}</span>
              <span style={countPillStyle(filterRoom === f.name)}>{f.count}</span>
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
            </select>
          </label>
        </div>
      </aside>

      {/* لولا min-width:0 لتمدّد الجدولُ والرفُّ القابلان للتمرير فكسرا الشبكة */}
      <div style={{ minWidth: 0 }}>
        <section style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 22, gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 30, margin: '0 0 4px', fontWeight: 700 }}>
              {activeLabel ?? 'مكتبتي المنزلية'}
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
              {trimmed
                ? `نتائج البحث عن "${trimmed}" — ${filtered.length} كتاب`
                : 'فهرس دافئ لكل كتاب في البيت — من الرف إلى القراءة'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--muted)' }}>
              <span><strong style={{ color: 'var(--text)' }}>{books.length}</strong> كتاب</span>
              <span><strong style={{ color: 'var(--star)' }}>{readingCount}</strong> قيد القراءة</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface)', fontSize: 12.5, color: 'var(--text)',
              }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 4, background: 'var(--header)', borderRadius: 9, padding: 3 }}>
              <button type="button" onClick={() => setViewMode('grid')} style={viewToggleStyle(viewMode === 'grid')}>شبكة</button>
              <button type="button" onClick={() => setViewMode('table')} style={viewToggleStyle(viewMode === 'table')}>جدول</button>
              <button type="button" onClick={() => setViewMode('shelf')} style={viewToggleStyle(viewMode === 'shelf')}>أرفف</button>
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240, display: 'flex', alignItems: 'center' }}>
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
          <ShelfView books={filtered} rooms={filterRoom === ALL ? shelves : [filterRoom]} />
        )}
      </div>
    </main>
  )
}

// ------------------------------------------------------------------ شبكة
function GridView({ books }: { books: Book[] }) {
  const { settings } = useLibrary()
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 20 }}>
      {books.map((book) => (
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
              marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {book.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>{book.author_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{
                fontSize: 11, color: 'var(--muted)', background: 'var(--header)',
                padding: '2px 8px', borderRadius: 6,
              }}>
                {book.category}
              </span>
              {settings.show_ratings && <Stars rating={book.rating} />}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

// ------------------------------------------------------------------ جدول
const TABLE_COLUMNS = 'minmax(0,2.4fr) minmax(0,1.6fr) 92px minmax(0,1fr) 76px 72px 68px 104px 86px'

function TableView({ books }: { books: Book[] }) {
  const { authorById, settings } = useLibrary()
  const cell = { padding: '11px 10px', fontSize: 12.5, color: 'var(--muted)' } as const
  const clipped = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const

  return (
    <section style={{ ...cardStyle, borderRadius: 14, overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
      {/* الترويسة والصفوف تتقاسمان العرض الأدنى نفسه لتبقى الأعمدة متحاذية */}
      <div style={{
        minWidth: 900, display: 'grid', gridTemplateColumns: TABLE_COLUMNS,
        background: 'var(--header)', fontSize: 12, color: 'var(--muted)', fontWeight: 700, padding: '0 6px',
      }}>
        {['العنوان', 'المؤلِّف', 'الوفاة', 'التصنيف', 'النشر', 'الصفحات', 'المجلدات', 'الحالة', 'التقييم'].map((h) => (
          <div key={h} style={{ padding: '11px 10px' }}>{h}</div>
        ))}
      </div>

      {books.map((book) => {
        const author = authorById(book.author_id)
        return (
          <div
            key={book.id}
            className="row-hover"
            onClick={() => navigate({ name: 'book', id: book.id })}
            style={{
              minWidth: 900, display: 'grid', gridTemplateColumns: TABLE_COLUMNS,
              alignItems: 'center', cursor: 'pointer', padding: '0 6px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{ padding: '11px 10px', fontFamily: 'var(--heading-font)', fontSize: 14.5, fontWeight: 700, ...clipped }}>
              {book.title}
            </div>
            <div style={{ padding: '11px 10px', fontSize: 13, ...clipped }}>{book.author_name}</div>
            <div style={cell}>{author?.death != null ? `${author.death} ${author.era}` : '—'}</div>
            <div style={{ ...cell, ...clipped }}>{book.category || '—'}</div>
            <div style={cell}>{yearLabel(book.year, book.year_era)}</div>
            <div style={cell}>{book.pages ?? '—'}</div>
            <div style={cell}>{volumesOf(book)}</div>
            <div style={{ padding: '11px 10px' }}>
              {book.status
                ? <StatusBadge status={book.status} />
                : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>}
            </div>
            <div style={{ padding: '11px 10px', fontSize: 12.5, color: 'var(--star)', letterSpacing: 1 }}>
              {settings.show_ratings && book.rating > 0 ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : '—'}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ------------------------------------------------------------------ أرفف
function ShelfView({ books, rooms }: { books: Book[]; rooms: string[] }) {
  const sections = rooms
    .map((room) => ({ room, roomBooks: books.filter((b) => b.room === room) }))
    .filter((s) => s.roomBooks.length > 0)

  if (sections.length === 0) {
    return <EmptyState title="لا توجد كتب مطابقة" hint="جرّب تعديل الفلاتر أو كلمة البحث" />
  }

  return (
    <>
      {sections.map(({ room, roomBooks }) => {
        const spineCount = roomBooks.reduce((sum, b) => sum + volumesOf(b), 0)
        return (
          <div key={room} style={{ marginBottom: 34 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--heading-font)', fontSize: 19, fontWeight: 700 }}>{room}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {roomBooks.length} كتاب — {spineCount} مجلَّد على الرف
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(180deg, oklch(0.93 0.02 65) 0%, oklch(0.9 0.02 65) 82%, oklch(0.42 0.09 45) 82%, oklch(0.32 0.08 40) 100%)',
              borderRadius: 10, padding: '24px 20px 0', display: 'flex', alignItems: 'flex-end',
              gap: 3, overflowX: 'auto', boxShadow: 'inset 0 0 0 1px var(--border)',
            }}>
              {roomBooks.flatMap((book) => {
                const count = volumesOf(book)
                const useImage = book.use_spine
                const width = useImage ? 34 : 32 + (book.title.length % 4) * 4
                const height = Math.round(Math.min(238, Math.max(152, 152 + ((book.pages ?? 200) / 1200) * 86)))

                return Array.from({ length: count }, (_, i) => {
                  const volume = i + 1
                  const spineUrl = book.spine_images?.[String(volume)]
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
                      {useImage && spineUrl ? (
                        <ImageSlot url={spineUrl} folder="spines" canEdit={false} onUploaded={() => {}} placeholder="كعب" />
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

                      {count > 1 && (
                        <span style={{
                          position: 'absolute', top: 5, right: '50%', transform: 'translateX(50%)',
                          minWidth: 16, textAlign: 'center', fontSize: 10, fontWeight: 700,
                          padding: '1px 4px', borderRadius: 4,
                          background: 'oklch(0.98 0.01 75 / 0.92)', color: 'oklch(0.28 0.03 45)',
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
