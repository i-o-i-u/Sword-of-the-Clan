// صفحة الكتاب (§٥-٣): بياناته كاملة، وصلته بغيره من الكتب، وما استُخرج منه
// من فوائد، وحالة قراءته وتقييمه، وسجل إعارته.
//
// البطاقة عرضٌ لا تعديل: لا يُعدَّل فيها إلا التقييم وحالة القراءة، وما ليس
// من بيانات الكتاب أصلًا (الفوائد والإعارة). وقلمُ التعديل في أعلاها يفتح
// نموذج الكتاب مملوءًا.
//
// والبيانات مقسومةٌ هنا بأقسام النموذج نفسها — بيانات الكتاب، ثم الطبعة، ثم
// النسخة، ثم عنه — كي يجد الفاهرسُ ما أدخله حيث أدخله. ومفاتيح الصفوف هي
// مفاتيح `META_DEFS` نفسها، فما أخفاه صاحب المكتبة من حقولٍ يبقى مخفيًّا.

import { useMemo, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { HIJRI_MONTHS, deathLabel, toArabicDigits, yearLabel } from '../lib/hijri'
import {
  LANGUAGES, PERK_KINDS, STATUSES, STATUS_UNKNOWN, WORK_PHRASES,
  contributorLabel, formatNumber, parseNumber, sumVolumePages,
  type Author, type Book, type PerkKind, type ReadingStatus,
} from '../lib/types'
import ImageSlot from '../components/ImageSlot'
import {
  ArchiveIcon, BackButton, ChevronIcon, ClearIcon, EmptyState, HourglassIcon,
  InfoIcon, LinkIcon, Money, OpenBookIcon, OwnerIcon, PencilIcon, PressIcon,
  VerifyIcon,
  cardStyle, chipStyle, ghostButtonStyle, outlineTabStyle,
} from '../components/ui'

/** صفٌّ من صفوف البيانات. `key` مفتاحُه في `hidden_fields`. */
interface Row {
  key: string
  label: string
  value: ReactNode
  /** يمتدّ على عرض القسم كلِّه: النصوص الطويلة والقوائم */
  wide?: boolean
}

export default function BookDetail({ bookId }: { bookId: string }) {
  const {
    bookById, authorById, works, perks, loans, settings,
    isOwner, canEdit, patchBook, run, reload,
  } = useLibrary()

  const book = bookById(bookId)
  const vis = settings.visibility
  const showTo = (key: keyof typeof vis) => isOwner || vis[key]
  const hidden = (key: string) => settings.hidden_fields.includes(key)

  const [showVolumes, setShowVolumes] = useState(false)

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
  const volumePages = (book.volume_pages ?? []).map((v) => parseNumber(v) ?? 0)
  const indexVolumes = book.index_volumes ?? []
  const volumeParts = book.volume_parts ?? []
  const manyVolumes = volumePages.filter(Boolean).length > 1

  // ------------------------------------------------------- ١. بيانات الكتاب
  const bookRows: Row[] = [
    { key: 'subtitle', label: 'العنوان الفرعي', value: book.subtitle, wide: true },
    { key: 'series', label: 'السلسلة', value: book.series },
    { key: 'seriesNo', label: 'رقمه في السلسلة', value: book.series_no },
  ]

  // ------------------------------------------------------- ٢. بيانات الطبعة
  const editionRows: Row[] = [
    { key: 'publisher', label: 'دار النَّشْر', value: book.publisher },
    { key: 'place', label: 'بلد النَّشْر', value: book.place },
    { key: 'yearLabel', label: 'سنة النَّشْر', value: publishYear(book) },
    {
      key: 'edition',
      label: 'الطبعة',
      value: book.edition + (book.edition_notes ? ` (${book.edition_notes})` : ''),
    },
    {
      key: 'parts',
      label: 'الأَجْزاء أو الأَسْفار',
      value: book.single_part ? 'جزءٌ واحد' : formatNumber(book.parts),
    },
    {
      key: 'volumes',
      label: 'المُجلَّدات',
      value: book.single_volume ? 'مُجلَّدٌ واحد' : formatNumber(book.volumes),
    },
    {
      key: 'pages',
      label: manyVolumes ? 'عدد الصفحات إجمالًا' : 'عدد الصفحات',
      value: formatNumber(book.pages),
    },
    { key: 'size', label: 'حجْم الكتاب', value: book.size },
    { key: 'isbn', label: 'ردمك (ISBN)', value: book.isbn && <span dir="ltr">{book.isbn}</span> },
    {
      key: 'language',
      // العربية هي الأصل في هذه المكتبة، فلا يُشغَل بها سطر. ولا تُذكر اللغة
      // إلا حين تكون خبرًا: كتابٌ مترجَم، أو بلسانٍ آخر.
      label: 'اللغة',
      value: book.language && book.language !== LANGUAGES[0]
        ? book.language + (book.language_original ? ` (عن ${book.language_original})` : '')
        : '',
    },
  ]

  // ------------------------------------------------------- ٣. بيانات النسخة
  const copyRows: Row[] = [
    { key: 'cabinet', label: 'رقم الدولاب', value: book.cabinet_no },
    { key: 'shelfNo', label: 'رقم الرَّفّ', value: book.shelf_no },
    { key: 'binding', label: 'نوع التَّغْليف', value: book.binding },
    { key: 'condition', label: 'الحالة المادِّيَّة', value: book.condition },
    {
      key: 'source',
      label: 'صِفَة الوُرُود',
      value: book.source + (book.source_detail ? ` — ${book.source_detail}` : ''),
    },
    { key: 'acquired', label: 'تاريخ الوُرود', value: acquiredLabel(book) },
    { key: 'marginNote', label: 'طُرَّة الكتاب', value: book.margin_note, wide: true },
  ]
  // القيمة صفرًا لا تُعرض: صفرٌ ليس ثمنًا، بل حقلٌ لم يُملأ
  if (showTo('value') && (book.value ?? 0) > 0) {
    copyRows.push({
      key: 'value',
      label: 'قيمة الكتاب',
      value: <Money amount={book.value ?? 0} currency={settings.currency} />,
    })
  }

  // --------------------------------------------------------- ٤. عن الكتاب
  const aboutRows: Row[] = [
    { key: 'topic', label: 'الموضوع', value: book.topic },
  ]
  if (book.tags.length > 0) {
    aboutRows.push({
      key: 'tags',
      label: 'الوُسوم',
      wide: true,
      value: (
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {book.tags.map((tag) => (
            <span key={tag} style={{
              fontSize: 11.5, border: '1px solid var(--border)', color: 'var(--muted)',
              padding: '3px 10px', borderRadius: 999, fontWeight: 400,
            }}>
              {tag}
            </span>
          ))}
        </span>
      ),
    })
  }
  if (showTo('blurb') && book.blurb) {
    aboutRows.push({
      key: 'blurb',
      label: 'نبذة عن الكتاب',
      wide: true,
      value: <span style={{ lineHeight: 2, fontWeight: 400, whiteSpace: 'pre-line' }}>{book.blurb}</span>,
    })
  }
  if (showTo('notes') && book.notes) {
    aboutRows.push({
      key: 'notes',
      label: 'ملاحظاتي الشخصية',
      wide: true,
      value: <span style={{ lineHeight: 2, fontWeight: 400, whiteSpace: 'pre-line' }}>{book.notes}</span>,
    })
  }

  const keep = (rows: Row[]) => rows.filter((r) => !hidden(r.key) && filled(r.value))

  return (
    <main className="app-main" style={{ maxWidth: 1060, margin: '0 auto', padding: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
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

        <div style={{ minWidth: 0 }}>
          {/* ------------------------------------------------- ترويسة البطاقة */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {book.category && !hidden('category') && (
              <span style={{ fontSize: 12, background: 'var(--header)', padding: '4px 10px', borderRadius: 999 }}>
                {book.category}
              </span>
            )}
            {book.cabinet_no && !hidden('cabinet') && (
              <span style={{ fontSize: 12, background: 'var(--header)', padding: '4px 10px', borderRadius: 999 }}>
                دولاب {book.cabinet_no}{book.shelf_no ? ` — رفّ ${book.shelf_no}` : ''}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, margin: '0 0 14px' }}>
            {book.title}
          </h1>

          {/* اسم المؤلِّف كاملًا بنسبه — لا المختصرَ الذي يُعرض في الشبكة
              والأرفف. البطاقة موضع التفصيل، وما دونها موضع الاختصار. */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20,
            padding: '13px 16px', background: 'var(--header)', borderRadius: 11,
          }}>
            <AuthorLine
              author={author}
              fallbackName={book.author_name}
              linked={!!book.author_id && (isOwner || vis.authors)}
            />
            {(book.co_authors ?? []).map((co) => (
              <AuthorLine
                key={co.name}
                author={authorById(co.author_id)}
                fallbackName={co.name}
                linked={!!co.author_id && (isOwner || vis.authors)}
                label="شارَكه"
              />
            ))}
            {!hidden('contributors') && <Contributors book={book} />}
          </div>

          {/* ------------------------------------------------- أقسام البيانات */}
          <Section icon={<OpenBookIcon size={17} />} title="بيانات الكتاب" rows={keep(bookRows)} />

          <Section
            icon={<PressIcon size={17} />}
            title="بيانات الطبعة"
            rows={keep(editionRows)}
            after={manyVolumes && !hidden('volumePagesText') && (
              <VolumeBreakdown
                pages={volumePages}
                parts={volumeParts}
                indexVolumes={indexVolumes}
                open={showVolumes}
                onToggle={() => setShowVolumes((v) => !v)}
              />
            )}
          />

          <Section icon={<ArchiveIcon size={17} />} title="بيانات النسخة" rows={keep(copyRows)} />

          <Section icon={<InfoIcon size={17} />} title="عن الكتاب" rows={keep(aboutRows)} />

          {/* ---------------------------------------------- صلاته بغيره */}
          {bookWorks.length > 0 && (
            <WorksOn rows={bookWorks.map((w) => ({ type: w.type, target: bookById(w.target_book_id) }))} />
          )}
          {worksAbout.length > 0 && (
            <WorksAbout rows={worksAbout.map((w) => ({ type: w.type, target: bookById(w.book_id) }))} />
          )}

          {showTo('perks') && <PerksPanel bookId={book.id} perks={bookPerks} />}

          {/* حالة القراءة والتقييم: كلاهما يُرفع فيصير غير مثبَت، فليس كل
              كتابٍ في المكتبة قد استقرّ له حكم. */}
          {showTo('status') && (canEdit || book.status) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>حالة القراءة</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                {canEdit && book.status && (
                  <button
                    type="button"
                    onClick={() => void patchBook(book.id, { status: '' })}
                    title="رفعُ حالة القراءة"
                    style={clearButtonStyle}
                  >
                    <ClearIcon size={14} />
                    {STATUS_UNKNOWN}
                  </button>
                )}
              </div>
            </div>
          )}

          {showTo('ratings') && (canEdit || book.rating > 0) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                {canEdit ? 'تقييمي' : 'تقييم صاحب المكتبة'}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
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
                {canEdit && book.rating > 0 && (
                  <button
                    type="button"
                    onClick={() => void patchBook(book.id, { rating: 0 })}
                    title="إزالة التقييم"
                    style={{ ...clearButtonStyle, marginInlineStart: 10 }}
                  >
                    <ClearIcon size={14} />
                    إزالة التقييم
                  </button>
                )}
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

const clearButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
  borderRadius: 8, padding: '6px 11px', fontSize: 12,
} as const

/** هل في الصفّ ما يُعرض؟ الفارغ والصفر والشرطة لا تُشغل سطرًا */
function filled(value: ReactNode): boolean {
  if (value === null || value === undefined || value === false) return false
  if (typeof value === 'string') return value.trim() !== '' && value.trim() !== '—'
  if (typeof value === 'number') return value !== 0
  return true
}

// ------------------------------------------------------------- قسمٌ من الأقسام
function Section(
  { icon, title, rows, after }:
  { icon: ReactNode; title: string; rows: Row[]; after?: ReactNode },
) {
  if (rows.length === 0 && !after) return null

  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead icon={icon} title={title} />

      {rows.length > 0 && (
        <div className="detail-fields" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '13px 20px',
        }}>
          {rows.map((row) => (
            <div key={row.key} style={{ minWidth: 0, gridColumn: row.wide ? '1 / -1' : undefined }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 3 }}>{row.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {after}
    </section>
  )
}

// ------------------------------------------------------------ سطر المؤلِّف
function AuthorLine(
  { author, fallbackName, linked, label = 'المُؤلِّف' }:
  { author: Author | null; fallbackName: string; linked: boolean; label?: string },
) {
  // الاسم الكامل بنسبه إن سُجِّل، وإلا فالمختصر الذي يُعرض في القوائم
  const name = author?.full_name?.trim() || author?.name?.trim() || fallbackName
  const death = deathLabel(author)
  if (!name) return null

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 14.5 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
        <OwnerIcon size={15} />
        {label}:
      </span>
      {linked && author ? (
        <span
          onClick={() => navigate({ name: 'author', id: author.id })}
          style={{
            color: 'var(--accent)', cursor: 'pointer', fontWeight: 700,
            borderBottom: '1px dashed var(--accent)',
          }}
        >
          {name}
        </span>
      ) : (
        <span style={{ fontWeight: 700 }}>{name}</span>
      )}
      {death && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)' }}>
          <HourglassIcon size={13} />
          {death}
        </span>
      )}
    </div>
  )
}

/**
 * المشاركون مجموعين بصفاتهم: إذا اجتمع اثنان من صفةٍ واحدة ثُنِّي لفظُها،
 * وإن زادوا جُمِع، وتُعرض أسماؤهم بعضُها تحت بعض معطوفةً بالواو. وكلُّ صفةٍ
 * سطرٌ على حِدَة، فلا يُقال «المحقِّق ومن معه».
 */
function Contributors({ book }: { book: Book }) {
  const groups = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of book.contributors ?? []) {
      const name = c.name.trim()
      if (!name) continue
      map.set(c.role, [...(map.get(c.role) ?? []), name])
    }
    return [...map.entries()]
  }, [book.contributors])

  if (groups.length === 0) return null

  return (
    <>
      {groups.map(([role, names]) => (
        <div key={role} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13 }}>
            <VerifyIcon size={14} />
            {contributorLabel(role, names.length)}:
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {names.map((name, i) => (
              <span key={`${name}-${i}`} style={{ fontWeight: 600 }}>
                {i === 0 ? name : `و${name}`}
              </span>
            ))}
          </span>
        </div>
      ))}
    </>
  )
}

/**
 * تفصيل صفحات المجلَّدات، مطويٌّ تحت خانة الإجمالي حتى يُطلب. ومجلَّدات
 * الفهارس تُعلَّم ولا تُحسب في الإجمالي — فهرسٌ لا متن.
 */
function VolumeBreakdown(
  { pages, parts, indexVolumes, open, onToggle }:
  { pages: number[]; parts: string[]; indexVolumes: number[]; open: boolean; onToggle: () => void },
) {
  const total = sumVolumePages(pages, indexVolumes)

  return (
    <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px dashed var(--border)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none',
          background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, padding: 0,
        }}
      >
        <span style={{
          display: 'flex', transition: 'transform .18s',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>
          <ChevronIcon size={14} />
        </span>
        تفصيل صفحات كلّ مُجلّد
      </button>

      {open && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))',
          gap: '8px 16px', marginTop: 12,
        }}>
          {pages.map((count, i) => {
            const volume = i + 1
            const isIndex = indexVolumes.includes(volume)
            return (
              <div key={volume} style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--muted)' }}>المُجلَّد {volume}:</span>
                {/* المجلَّد الذي لم تُكتب صفحاتُه شرطةٌ لا صفر */}
                <span style={{ fontWeight: 600 }}>{count > 0 ? formatNumber(count) : '—'}</span>
                {parts[i]?.trim() && (
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>({parts[i].trim()})</span>
                )}
                {isIndex && (
                  <span style={{
                    fontSize: 10.5, color: 'var(--accent-soft)', border: '1px solid var(--border)',
                    borderRadius: 5, padding: '0 5px',
                  }}>
                    فهارس
                  </span>
                )}
              </div>
            )
          })}
          <div style={{
            gridColumn: '1 / -1', fontSize: 12.5, color: 'var(--muted)',
            borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2,
          }}>
            الإجمالي: <strong style={{ color: 'var(--text)' }}>{formatNumber(total)}</strong>
            {indexVolumes.length > 0 && ' — بلا صفحات مجلَّدات الفهارس'}
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------- صلات الكتب
/** ترويسة قسمٍ: أيقونةٌ في مربَّعٍ لطيف، ثم عنوانه */
function SectionHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13,
      paddingBottom: 11, borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 9, flex: 'none',
        background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
        color: 'var(--accent-soft)',
      }}>
        {icon}
      </span>
      <span style={{ fontFamily: 'var(--heading-font)', fontSize: 16.5, fontWeight: 700 }}>{title}</span>
    </div>
  )
}

/**
 * صلةُ الكتاب بأصله جملةٌ تامّة لا وسمٌ ونصّ: «هذا الكتاب شرحٌ لـ«كذا»
 * لـ(فلان الفلاني) ت ٨٠٨ هـ». وحرفُ الجرّ يتبع نوع العمل، وهو في
 * `WORK_PHRASES` لأنه لا يُقاس: شرحٌ «لـ» وحاشيةٌ «على» وانتقاءٌ «من».
 */
function WorksOn({ rows }: { rows: { type: string; target: Book | undefined }[] }) {
  const { authorById } = useLibrary()
  const visible = rows.filter((r) => r.target)
  if (visible.length === 0) return null

  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead icon={<LinkIcon size={16} />} title="هذا الكتاب عملٌ على غيره" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((row, i) => {
          const target = row.target!
          const targetAuthor = authorById(target.author_id)
          const authorName = targetAuthor?.full_name?.trim()
            || targetAuthor?.name?.trim() || target.author_name
          const death = deathLabel(targetAuthor)

          return (
            <div
              key={`${target.id}-${row.type}-${i}`}
              onClick={() => navigate({ name: 'book', id: target.id })}
              style={{
                cursor: 'pointer', background: 'var(--header)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '10px 13px', fontSize: 14.5, lineHeight: 2,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>هذا الكتاب </span>
              <span style={{ fontWeight: 700, color: 'var(--accent-soft)' }}>
                {WORK_PHRASES[row.type] ?? row.type}
              </span>
              <span> «</span>
              <strong>{target.title}</strong>
              <span>»</span>
              {authorName && (
                <>
                  <span style={{ color: 'var(--muted)' }}> لـ</span>
                  <span>({authorName})</span>
                  <span style={{ color: 'var(--muted)' }}> {death || 'مُعاصِر'}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** أعمالُ غيره عليه: قائمةٌ بأنواعها، فالجملة هناك تُقلَب فتثقُل */
function WorksAbout({ rows }: { rows: { type: string; target: Book | undefined }[] }) {
  const visible = rows.filter((r) => r.target)
  if (visible.length === 0) return null

  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead icon={<LinkIcon size={16} />} title="أعمالٌ على هذا الكتاب" />

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
              color: 'var(--text)', border: '1px solid var(--border)', background: 'var(--surface)',
            }}>
              {row.type}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.target!.title}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{row.target!.author_name}</span>
          </div>
        ))}
      </div>
    </section>
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
    <div style={{ ...cardStyle, marginBottom: 20, borderRadius: 12, padding: '16px 18px' }}>
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
