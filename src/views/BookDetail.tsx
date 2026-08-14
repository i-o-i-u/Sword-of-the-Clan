// صفحة الكتاب (§٥-٣): بياناته كاملة، وصلته بغيره من الكتب، وما استُخرج منه
// من فوائد، وحالة قراءته وتقييمه، وسجل إعارته.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { HIJRI_MONTHS, lifeLabel, toArabicDigits, yearLabel } from '../lib/hijri'
import {
  META_DEFS, PERK_KINDS, STATUSES,
  type Book, type PerkKind, type ReadingStatus,
} from '../lib/types'
import ImageSlot from '../components/ImageSlot'
import {
  BackButton, EmptyState, Money, PencilIcon,
  cardStyle, chipStyle, ghostButtonStyle, outlineTabStyle,
} from '../components/ui'

export default function BookDetail({ bookId }: { bookId: string }) {
  const {
    bookById, authorById, works, perks, loans, settings,
    isOwner, canEdit, patchBook, run, reload,
  } = useLibrary()

  const book = bookById(bookId)
  const vis = settings.visibility
  const showTo = (key: keyof typeof vis) => isOwner || vis[key]

  const bookWorks = useMemo(
    () => works.filter((w) => w.book_id === bookId),
    [works, bookId],
  )
  const worksAbout = useMemo(
    () => works.filter((w) => w.target_book_id === bookId),
    [works, bookId],
  )
  const bookPerks = useMemo(() => perks.filter((p) => p.book_id === bookId), [perks, bookId])
  const bookLoans = useMemo(() => loans.filter((l) => l.book_id === bookId), [loans, bookId])

  if (!book) {
    return (
      <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />
        <EmptyState title="لم يُعثَر على هذا الكتاب" hint="قد يكون حُذف، أو أنه غير ظاهرٍ للزوار." />
      </main>
    )
  }

  const author = authorById(book.author_id)

  // صفوف البيانات بترتيبها المعتمد، ويُسقَط الفارغ منها
  const metaValues: Record<string, string | number | null> = {
    subtitle: book.subtitle,
    // المشاركون سطرٌ واحد: «المُحقِّق: فلان، تقديم: فلان»
    contributors: (book.contributors ?? [])
      .map((c) => `${c.role}: ${c.name}`).join('، '),
    series: book.series,
    seriesNo: book.series_no,
    publisher: book.publisher,
    place: book.place,
    yearLabel: publishYear(book),
    edition: book.edition + (book.edition_notes ? ` (${book.edition_notes})` : ''),
    parts: book.single_part ? 'جزءٌ واحد' : book.parts,
    volumes: book.single_volume ? 'مُجلَّدٌ واحد' : book.volumes,
    pages: book.pages,
    volumePagesText: (book.volume_pages ?? []).filter(Boolean).join(' + '),
    size: book.size,
    isbn: book.isbn,
    language: book.language
      + (book.language_original ? ` (عن ${book.language_original})` : ''),
    cabinet: book.cabinet_no,
    shelfNo: book.shelf_no,
    binding: book.binding,
    condition: book.condition,
    source: book.source + (book.source_detail ? ` — ${book.source_detail}` : ''),
    acquired: acquiredLabel(book),
    marginNote: book.margin_note,
    topic: book.topic,
  }

  const metaRows = META_DEFS
    .map((def) => ({ label: def.label, value: metaValues[def.key] }))
    .filter((r) => r.value !== null && r.value !== undefined && r.value !== '' && r.value !== '—')

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />
        {/* البطاقة عرضٌ لا تعديل: بيانات الكتاب كلُّها تُصحَّح من نموذجه */}
        {canEdit && (
          <button
            type="button"
            onClick={() => navigate({ name: 'edit', id: book.id })}
            title="تعديل بيانات الكتاب"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 18,
              border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
              borderRadius: 9, padding: '8px 15px', fontSize: 13, fontWeight: 600,
            }}
          >
            <PencilIcon size={16} />
            تعديل بيانات الكتاب
          </button>
        )}
      </div>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 36 }}>
        <div>
          <div className="detail-cover" style={{
            width: '100%', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 12px 30px oklch(0.24 0.02 50 / 0.15)',
          }}>
            <ImageSlot
              url={book.cover_url}
              folder="covers"
              canEdit={false}
              placeholder="غلاف الكتاب"
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {book.category && (
              <span style={{ fontSize: 12, background: 'var(--header)', padding: '4px 10px', borderRadius: 999 }}>
                {book.category}
              </span>
            )}
            {book.cabinet_no && (
              <span style={{ fontSize: 12, background: 'var(--header)', padding: '4px 10px', borderRadius: 999 }}>
                دولاب {book.cabinet_no}{book.shelf_no ? ` — رفّ ${book.shelf_no}` : ''}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, margin: '0 0 4px' }}>
            {book.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
            {book.author_id && (isOwner || vis.authors) ? (
              <span
                onClick={() => navigate({ name: 'author', id: book.author_id! })}
                style={{
                  fontSize: 16, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                  borderBottom: '1px dashed var(--accent)',
                }}
              >
                {book.author_name}
              </span>
            ) : (
              <span style={{ fontSize: 16, fontWeight: 600 }}>{book.author_name}</span>
            )}
            {author && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{lifeLabel(author)}</span>}
            {(book.co_authors ?? []).map((co) => (
              <span key={co.name} style={{ fontSize: 14, fontWeight: 600 }}>و{co.name}</span>
            ))}
          </div>

          {(metaRows.length > 0 || showTo('value')) && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))',
              gap: '10px 18px', fontSize: 13, marginBottom: 22, padding: '14px 16px',
              background: 'var(--header)', borderRadius: 10,
            }}>
              {metaRows.map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}:</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
              {showTo('value') && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>القيمة:</span>
                  <span style={{ fontWeight: 600 }}>
                    <Money amount={book.value ?? 0} currency={settings.currency} />
                  </span>
                </div>
              )}
            </div>
          )}

          {book.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {book.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11.5, border: '1px solid var(--border)', color: 'var(--muted)',
                  padding: '3px 10px', borderRadius: 999,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {bookWorks.length > 0 && (
            <WorkList
              title="هذا الكتاب عملٌ على"
              filled
              rows={bookWorks.map((w) => ({ type: w.type, target: bookById(w.target_book_id) }))}
            />
          )}
          {worksAbout.length > 0 && (
            <WorkList
              title="أعمالٌ على هذا الكتاب"
              filled={false}
              rows={worksAbout.map((w) => ({ type: w.type, target: bookById(w.book_id) }))}
            />
          )}

          {showTo('blurb') && book.blurb && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>نبذة عن الكتاب</div>
              <div style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                {book.blurb}
              </div>
            </div>
          )}

          {showTo('perks') && <PerksPanel bookId={book.id} perks={bookPerks} />}

          {showTo('status') && book.status && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>حالة القراءة</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(canEdit ? STATUSES : STATUSES.filter((s) => s === book.status)).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && void patchBook(book.id, { status: status as ReadingStatus })}
                    style={{ ...outlineTabStyle(book.status === status), cursor: canEdit ? 'pointer' : 'default' }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showTo('ratings') && (canEdit || book.rating > 0) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                {canEdit ? 'تقييمي' : 'تقييم صاحب المكتبة'}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => canEdit && void patchBook(book.id, { rating: n })}
                    role={canEdit ? 'button' : undefined}
                    aria-label={canEdit ? `تقييم ${n} من ٥` : undefined}
                    style={{
                      fontSize: 26, lineHeight: 1, cursor: canEdit ? 'pointer' : 'default',
                      color: n <= book.rating ? 'var(--star)' : 'oklch(0.8 0.01 60)',
                    }}
                  >
                    {n <= book.rating ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showTo('notes') && book.notes && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>ملاحظاتي الشخصية</div>
              <div style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                {book.notes}
              </div>
            </div>
          )}

          {showTo('loans') && <LoansPanel bookId={book.id} loans={bookLoans} />}

          {canEdit && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 26, paddingTop: 18 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`هل تحذف «${book.title}» من الفهرس؟ لا رجعة في هذا.`)) return
                  await run(() => api.deleteBook(book.id))
                  await reload()
                  navigate({ name: 'browse' })
                }}
                style={{
                  border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)',
                  borderRadius: 8, padding: '7px 15px', fontSize: 12.5,
                }}
              >
                حذف الكتاب من الفهرس
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// -------------------------------------------------------------- صلات الكتب
function WorkList(
  { title, filled, rows }: { title: string; filled: boolean; rows: { type: string; target: Book | undefined }[] },
) {
  const visible = rows.filter((r) => r.target)
  if (visible.length === 0) return null

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((row, i) => (
          <div
            key={`${row.target!.id}-${row.type}-${i}`}
            onClick={() => navigate({ name: 'book', id: row.target!.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              background: 'var(--header)', border: '1px solid var(--border)',
              borderRadius: 9, padding: '9px 12px', flexWrap: 'wrap',
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 9px',
              ...(filled
                ? { color: 'var(--on-accent)', background: 'var(--accent)' }
                : { color: 'var(--text)', border: '1px solid var(--border)', background: 'var(--surface)' }),
            }}>
              {row.type}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.target!.title}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.target!.author_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------- الفوائد والمقتطفات
function PerksPanel({ bookId, perks }: { bookId: string; perks: ReturnType<typeof useLibrary>['perks'] }) {
  const { canEdit, run, reload } = useLibrary()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PerkKind>(PERK_KINDS[0])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [page, setPage] = useState('')

  const perkCount = perks.filter((p) => p.kind === 'فائدة').length
  const quoteCount = perks.length - perkCount
  const ready = !!(title.trim() && text.trim())

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', fontSize: 14, color: 'var(--text)', width: '100%',
  } as const

  return (
    <div style={{ ...cardStyle, marginBottom: 24, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700 }}>الفوائد والمقتطفات</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {perks.length === 0
              ? 'ما يُستخرَج من الكتاب من فوائد ونصوص'
              : `${perkCount} فائدة و${quoteCount} مقتطف`}
          </div>
        </div>
        {canEdit && (
          <button type="button" onClick={() => { setOpen(!open); setTitle(''); setText(''); setPage('') }} style={ghostButtonStyle}>
            {open ? 'إغلاق' : '+ إضافة فائدة أو مقتطف'}
          </button>
        )}
      </div>

      {canEdit && open && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14,
          paddingBottom: 14, borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERK_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} style={chipStyle(kind === k)}>{k}</button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الفائدة أو المقتطف" style={inputStyle} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="نصّ الفائدة أو المقتطف"
            style={{ ...inputStyle, minHeight: 90, lineHeight: 1.9, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="الصفحة (اختياري)"
              style={{ ...inputStyle, width: 150, padding: '8px 12px', fontSize: 13 }}
            />
            <button
              type="button"
              disabled={!ready}
              onClick={async () => {
                if (!ready) return
                await run(() => api.insertPerk({
                  book_id: bookId, kind, title: title.trim(), text: text.trim(), page: page.trim(),
                }))
                setOpen(false); setTitle(''); setText(''); setPage('')
                await reload()
              }}
              style={{
                background: ready ? 'var(--accent)' : 'var(--border)',
                color: ready ? 'var(--on-accent)' : 'var(--muted)',
                border: 'none', borderRadius: 8, padding: '9px 22px',
                fontSize: 13.5, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed',
              }}
            >
              حفظ
            </button>
          </div>
        </div>
      )}

      {perks.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>لم تُسجَّل فوائد ولا مقتطفات من هذا الكتاب بعد.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {perks.map((p) => (
            <div key={p.id} style={{
              border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: 'var(--bg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 9px',
                  ...(p.kind === 'فائدة'
                    ? { color: 'var(--on-accent)', background: 'var(--accent)' }
                    : { color: 'var(--text)', border: '1px solid var(--border)', background: 'var(--header)' }),
                }}>
                  {p.kind}
                </span>
                <span style={{ fontFamily: 'var(--heading-font)', fontSize: 15.5, fontWeight: 700, flex: 1 }}>{p.title}</span>
                {p.page && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>ص {p.page}</span>}
                {canEdit && (
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={async () => { await run(() => api.deletePerk(p.id)); await reload() }}
                    style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 16, lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </div>
              <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text)', whiteSpace: 'pre-line' }}>{p.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------- سجل الإعارة
function LoansPanel({ bookId, loans }: { bookId: string; loans: ReturnType<typeof useLibrary>['loans'] }) {
  const { canEdit, run, reload } = useLibrary()
  const [open, setOpen] = useState(false)
  const [borrower, setBorrower] = useState('')
  const [due, setDue] = useState('')

  const smallInput = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 13, color: 'var(--text)',
  } as const

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700 }}>سجل الإعارة</div>
        {canEdit && (
          <button
            type="button"
            onClick={() => { setOpen(!open); setBorrower(''); setDue('') }}
            style={{ ...ghostButtonStyle, padding: '6px 14px', fontWeight: 400 }}
          >
            {open ? 'إغلاق' : '+ تسجيل إعارة'}
          </button>
        )}
      </div>

      {canEdit && open && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="اسم المستعير"
            style={{ ...smallInput, flex: 1, minWidth: 160 }}
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={smallInput} />
          <button
            type="button"
            onClick={async () => {
              await run(() => api.insertLoan({
                book_id: bookId, borrower: borrower.trim() || '—', due_date: due || null,
              }))
              setOpen(false); setBorrower(''); setDue('')
              await reload()
            }}
            style={{
              background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
              borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600,
            }}
          >
            حفظ
          </button>
        </div>
      )}

      {loans.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>لم يُعَر هذا الكتاب من قبل.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loans.map((loan) => (
            <div key={loan.id} style={{
              ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: 10, padding: '10px 14px', fontSize: 13, flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <strong>{loan.borrower}</strong> — استعار في {loan.lent_date}، الموعد {loan.due_date ?? '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 6,
                  ...(loan.returned
                    ? { color: 'oklch(0.4 0.08 150)', background: 'oklch(0.93 0.03 150)' }
                    : { color: 'oklch(0.45 0.1 70)', background: 'oklch(0.94 0.04 75)' }),
                }}>
                  {loan.returned ? 'تم الإرجاع' : 'قيد الإعارة'}
                </span>
                {canEdit && !loan.returned && (
                  <button
                    type="button"
                    onClick={async () => { await run(() => api.returnLoan(loan.id)); await reload() }}
                    style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 12, textDecoration: 'underline' }}
                  >
                    تسجيل الإرجاع
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** سنة النشر كما تُعرض: تقريبٌ كما كُتب، أو شهرٌ وسنة، أو سنةٌ وحدها */
function publishYear(book: Book): string {
  if (book.year_approx) return book.year_text
  if (book.year == null) return ''
  const year = yearLabel(book.year, book.year_era)
  return book.year_month ? `${HIJRI_MONTHS[book.year_month - 1]} ${year}` : year
}

/** تاريخ الوُرود: مثلُ سنة النشر، بلا يومٍ فاليوم لا يُسأل عنه */
function acquiredLabel(book: Book): string {
  if (book.acquired_approx) return book.acquired_text
  if (book.acquired_year == null) return ''
  const year = `${toArabicDigits(book.acquired_year)} هـ`
  return book.acquired_month ? `${HIJRI_MONTHS[book.acquired_month - 1]} ${year}` : year
}
