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

import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { hashFor, navigate, shortBookLink } from '../lib/router'
import { citationOf } from '../lib/citation'
import { HIJRI_MONTHS, deathLabel, toArabicDigits, yearLabel } from '../lib/hijri'
import { formatIsbn, isbnInfo } from '../lib/isbn'
import {
  BOOKS_COUNT, COPIES_COUNT, LANGUAGES, STATUSES, STATUS_UNKNOWN,
  WORK_PHRASES, contributorLabel, countLabel, formatNumber,
  missingVolumeLabel, missingVolumesHeadline, parseNumber, sumVolumePages,
  type Author, type Book, type Perk, type ReadingStatus, type WithinTitle,
} from '../lib/types'
import {
  editionGroup, isCollection, issueBadge, issueLine, pressesLine, pressesOf,
  printedWithin, volumeYearSpan, withinLabelOf, withinTitlesOf,
} from '../lib/editions'
import ImageSlot from '../components/ImageSlot'
import PerkCard from '../components/PerkCard'
import PerkEditor from '../components/PerkEditor'
import { PerkIcon } from '../components/ui'
import {
  ArchiveIcon, BackButton, ChevronIcon, ClearIcon, CopyButton, CopyIcon,
  EmptyState, HourglassIcon, InfoIcon, LinkIcon, Money, OpenBookIcon, OwnerIcon,
  PencilIcon, PressIcon, PrinterIcon, QuoteIcon, VerifyIcon, WithinIcon,
  cardStyle, ghostButtonStyle, outlineTabStyle, resolveAsset,
} from '../components/ui'

// عارض الصورة لا يُفتح في كل زيارة، فلا يُحمَّل مع الصفحة
const ImageViewer = lazy(() => import('../components/ImageViewer'))

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
    books, bookById, authorById, works, perks, loans, publishers, settings,
    isOwner, canEdit, patchBook, run, reload,
  } = useLibrary()

  // المعرّف التامّ أوّلًا، فإن لم يُصَب فبادئته: الرابط المختصر `#/b/xxxxxx`
  // لا يحمل إلا أوّل المعرّف، فتُعرف منه صفحةُ الكتاب.
  const book = useMemo(
    () => bookById(bookId) ?? books.find((b) => b.id.startsWith(bookId)),
    [books, bookById, bookId],
  )
  const vis = settings.visibility
  const showTo = (key: keyof typeof vis) => isOwner || vis[key]
  const hidden = (key: string) => settings.hidden_fields.includes(key)

  const [showVolumes, setShowVolumes] = useState(false)
  // وقسمُ ما طُبع معه مطويٌّ حتى يُفتح: المجموعةُ تضمّ عشرين عنوانًا وأكثر
  const [showWithin, setShowWithin] = useState(false)
  const [zoomCover, setZoomCover] = useState(false)

  // ما تعلَّق بالكتاب يُطلب بمعرّفه التامّ لا بما جاء في الرابط، فقد يكون
  // بادئةً مختصرة
  const id = book?.id ?? bookId

  const bookWorks = useMemo(() => works.filter((w) => w.book_id === id), [works, id])
  const worksAbout = useMemo(() => works.filter((w) => w.target_book_id === id), [works, id])
  const bookPerks = useMemo(() => perks.filter((p) => p.book_id === id), [perks, id])
  const bookLoans = useMemo(() => loans.filter((l) => l.book_id === id), [loans, id])

  if (!book) {
    return (
      <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />
        <EmptyState title="لم يُعثَر على هذا الكتاب" hint="قد يكون حُذف، أو أنه غير ظاهرٍ للزوار." />
      </main>
    )
  }

  const author = authorById(book.author_id)
  const hasAttrib = !!(
    book.author_name.trim()
    || (book.co_authors ?? []).some((c) => c.name.trim())
    || (!hidden('contributors') && (book.contributors ?? []).some((c) => c.name.trim()))
  )
  // صفحةُ الدار لا تُعرض إلا لدارٍ بقي لها كتابٌ ظاهر، فالرابطُ إليها لا
  // يُكتب إلا إذا كانت في القائمة التي جاءت من الخادم
  const presses = pressesOf(book)
  const shownPresses = new Set(publishers.map((p) => p.id))
  const yearSpan = volumeYearSpan(book)
  // ما طُبع هذا ضمنه، وما طُبع ضمنه من الكتب. وكلاهما بابٌ إلى كتابٍ في
  // الفهرس، فلا يُكتب إلا إذا كان المُشارُ إليه ظاهرًا — والخادمُ يفكّ
  // الصلةَ عن الزائر إذا حُجب طرفُها، فما بقي ههنا فهو ظاهر.
  const within = book.within_book_id ? bookById(book.within_book_id) : undefined
  const insideTitles = withinTitlesOf(book)
  const inside = printedWithin(books, book)
  const editions = editionGroup(books, book)
  const issue = issueBadge(book)
  const volumePages = (book.volume_pages ?? []).map((v) => parseNumber(v) ?? 0)
  const indexVolumes = book.index_volumes ?? []
  const volumeParts = book.volume_parts ?? []
  const volumeYears = book.volume_years ?? []
  const manyVolumes = volumePages.filter(Boolean).length > 1
  // وتفصيلُ المجلَّدات يُعرض لأيّ تفصيلٍ أُدخل، لا للصفحات وحدها: قد تُعرف
  // سنةُ كل مجلَّدٍ من الكتاب الذي امتدّ إخراجُه سنين ولا تُعرف صفحاتُه بعد،
  // فلو عُلِّق العرضُ على الصفحات لسقط ما أُدخل من السنين صامتًا.
  const volumeDetail = manyVolumes
    || volumeYears.filter(Boolean).length > 1
    || volumeParts.filter((p) => p.trim()).length > 0
  const missing = [...(book.missing_volumes ?? [])].sort((a, b) => a.no - b.no)

  // ------------------------------------------------------- ١. بيانات الكتاب
  const bookRows: Row[] = [
    { key: 'subtitle', label: 'العنوان الفرعي', value: book.subtitle, wide: true },
    { key: 'series', label: 'السلسلة', value: book.series },
    { key: 'seriesNo', label: 'رقمه في السلسلة', value: book.series_no },
  ]

  // ------------------------------------------------------- ٢. بيانات الطبعة
  const editionRows: Row[] = [
    {
      // اسمُ الدار بابٌ إلى صفحتها كما اسمُ المؤلِّف بابٌ إلى صفحته: فيها
      // شعارُها وبلدُها وسائرُ كتبها. ولا يكون رابطًا إلا إذا كانت لها صفحةٌ
      // تُعرض — أي إذا بقي لها في المكتبة كتابٌ ظاهر.
      key: 'publisher',
      // الدارُ الواحدة والدُّورُ المتعدِّدة صفٌّ واحد، وإنما يتبدّل لفظُه
      label: presses.length > 1 ? 'دُور النَّشْر' : 'دار النَّشْر',
      wide: presses.length > 1,
      value: presses.length > 0 && <Presses presses={presses} shown={shownPresses} />,
    },
    { key: 'place', label: 'بلد النَّشْر', value: book.place },
    {
      // سنةُ النشر نقطةٌ في أكثر الكتب، ومَدًى في الذي يمتدّ إخراجُه سنين:
      // صدر أوّلُ التذييل والتكميل ثم توالت مجلَّداتُه ستًّا وعشرين سنة،
      // فسنةٌ واحدة لا تُخبر عنه.
      key: 'yearLabel',
      label: yearSpan ? 'سنوات النَّشْر' : 'سنة النَّشْر',
      value: yearSpan || publishYear(book),
    },
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
    {
      // ما نقص من المجلَّدات: خبرٌ عن النسخة التي عندنا لا عن الطبعة، غير
      // أنّ موضعَه مع المجلَّدات أهدى من إفراده في قسمٍ آخر
      key: 'missingVolumes',
      label: 'المُجلَّدات الناقصة',
      wide: true,
      value: missing.length > 0
        ? (
          <span>
            <span style={{ color: 'var(--danger)' }}>
              {missingVolumesHeadline(missing.length)}
            </span>
            {' — '}
            {missing.map((m) => missingVolumeLabel(m)).join('، و')}
          </span>
        )
        : '',
    },
    {
      // هيئةُ النشرة: الأصلُ لا يُقال، فالنُّسَخُ أصولٌ عند الناس كلِّهم —
      // وإنما الخبرُ فيما فارقه، وهو ما تردُّه `issueLine` فارغًا للأصل.
      key: 'issueKind',
      label: 'هيئة النشرة',
      wide: true,
      value: issueLine(book),
    },
    {
      // كتابٌ طُبع ضمن كتاب: بابٌ إلى ضامِّه، وموضعُه منه إن كُتب
      key: 'within',
      label: 'مطبوعٌ ضمن',
      wide: true,
      value: within && (
        <span>
          <a
            className="row-link"
            href={hashFor({ name: 'book', id: within.id })}
            onClick={(e) => { e.preventDefault(); navigate({ name: 'book', id: within.id }) }}
          >
            {within.title}
          </a>
          {book.within_pages.trim() && (
            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
              {' — '}{toArabicDigits(book.within_pages.trim())}
            </span>
          )}
        </span>
      ),
    },
    { key: 'size', label: 'حجْم الكتاب', value: book.size },
    {
      // الردمك يُعرض مُشرَّطًا كما يُطبَع على ظهر الكتاب، ومعه بلدُ مجموعته
      // إن عُرفت — خبرٌ يُقرأ من الرقم نفسه لا يُدخَل
      key: 'isbn',
      label: 'ردمك (ISBN)',
      value: book.isbn && (
        <span className="isbn-value">
          <span dir="ltr">{formatIsbn(book.isbn) || book.isbn}</span>
          {isbnInfo(book.isbn).country && (
            <span className="isbn-country">{isbnInfo(book.isbn).country}</span>
          )}
        </span>
      ),
    },
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
    {
      // النسخةُ الواحدة هي الأصل فلا تُعرض: صفٌّ يقول «نسخةٌ واحدة» ليس خبرًا
      key: 'copies',
      label: 'نُسَخُه في المكتبة',
      value: (book.copies ?? 1) > 1 ? countLabel(book.copies, COPIES_COUNT) : '',
    },
    { key: 'binding', label: 'نوع التَّغْليف', value: book.binding },
    { key: 'condition', label: 'الحالة المادِّيَّة', value: book.condition },
    {
      key: 'conditionNotes',
      label: 'ملاحظاتٌ على حالته',
      wide: true,
      value: book.condition_notes
        ? <span className="prose" style={{ fontWeight: 400 }}>{book.condition_notes}</span>
        : '',
    },
    {
      key: 'source',
      label: 'صِفَة الوُرُود',
      value: book.source + (book.source_detail ? ` — ${book.source_detail}` : ''),
    },
    { key: 'acquired', label: 'تاريخ الوُرود', value: acquiredLabel(book) },
    {
      key: 'marginNote',
      label: 'طُرَّة الكتاب',
      wide: true,
      value: book.margin_note
        ? <span className="prose" style={{ fontWeight: 400 }}>{book.margin_note}</span>
        : '',
    },
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
      value: <span className="prose" style={{ fontWeight: 400 }}>{book.blurb}</span>,
    })
  }
  if (showTo('notes') && book.notes) {
    aboutRows.push({
      key: 'notes',
      label: 'ملاحظاتي الشخصية',
      wide: true,
      value: <span className="prose" style={{ fontWeight: 400 }}>{book.notes}</span>,
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
            className="edit-pen"
            onClick={() => navigate({ name: 'edit', id: book.id })}
            title="تعديل بيانات الكتاب"
          >
            <PencilIcon size={16} />
            تعديل بيانات الكتاب
          </button>
        )}
      </div>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 36 }}>
        <div>
          {/* النقر على الغلاف يعرضه مكبَّرًا: الغلاف بيانٌ من بيانات الكتاب،
              وما في هذه البطاقة يكفي لقراءته لا لتأمّله. */}
          <div
            className={`detail-cover${book.cover_url ? ' zoomable' : ''}`}
            onClick={() => { if (book.cover_url) setZoomCover(true) }}
            role={book.cover_url ? 'button' : undefined}
            title={book.cover_url ? 'اعرض الغلاف مكبَّرًا' : undefined}
            style={{
              width: '100%', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 12px 30px oklch(0.24 0.02 50 / 0.15)',
            }}
          >
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
                {book.sub_category ? `${book.category} ← ${book.sub_category}` : book.category}
              </span>
            )}
            {book.cabinet_no && !hidden('cabinet') && (
              <span style={{ fontSize: 12, background: 'var(--header)', padding: '4px 10px', borderRadius: 999 }}>
                دولاب {book.cabinet_no}{book.shelf_no ? ` — رفّ ${book.shelf_no}` : ''}
              </span>
            )}
            {/* المتنُ الدرسيّ خبرٌ عن الكتاب يُعرف بنظرة، وبابٌ إلى إخوته */}
            {book.is_matn && !hidden('category') && (
              <a
                className="book-flag book-flag-matn"
                href={hashFor({ name: 'matns' })}
                onClick={(e) => { e.preventDefault(); navigate({ name: 'matns' }) }}
                title="من المتون الدرسية في المكتبة"
              >
                مَتْنٌ دَرْسيّ
              </a>
            )}
            {/* والمجموعةُ عنوانُها اسمُ مجموعةٍ لا اسمُ كتاب، فيُعلَّم بذلك:
                من رأى «برنامج مهمّات العلم» في الفهرس لا يظنّه كتابًا */}
            {isCollection(book) && (
              <span
                className="book-flag book-flag-issue"
                title="عنوانُ هذا السجلّ اسمُ مجموعةٍ طُبع فيها كتب، لكلٍّ مؤلِّفُه"
              >
                مجموعةٌ مطبوعة
              </span>
            )}
            {/* والمصوَّرةُ وإعادةُ الصفّ خبرٌ عن النسخة لا عن الكتاب: هي أقلُّ
                قيمةً أثريّةً من الأصل، وذلك ممّا يُعرف بنظرةٍ لا بقراءة صفّ */}
            {issue && !hidden('issueKind') && (
              <span className="book-flag book-flag-issue" title={issueLine(book)}>
                {issue}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, margin: '0 0 14px' }}>
            {book.title}
          </h1>

          {/* اسم المؤلِّف كاملًا بنسبه — لا المختصرَ الذي يُعرض في الشبكة
              والأرفف. البطاقة موضع التفصيل، وما دونها موضع الاختصار.
              وهو لوحُ نسبةٍ لا صندوق: شريطٌ لوّنه لون المكتبة عن يمينه،
              وصفوفٌ يفصلها خطٌّ خفيف، ولكلّ صفٍّ صفتُه في عمودٍ ثابت. */}
          {/* ولا يُعرض لوحُ النسبة فارغًا: المجموعةُ لا مؤلِّف لها، فإن لم
              يكن لها من أشرف عليها لم يبقَ في اللوح شيء — ولوحٌ لا نسبةَ فيه
              ليس خبرًا. */}
          {(hasAttrib) && (
          <section className="attrib">
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
            {!hidden('contributors') && (
              <Contributors book={book} linked={isOwner || vis.authors} />
            )}
          </section>
          )}

          {/* ------------------------------------------------- أقسام البيانات */}
          <Section icon={<OpenBookIcon size={17} />} title="بيانات الكتاب" rows={keep(bookRows)} />

          <Section
            icon={<PressIcon size={17} />}
            title="بيانات الطبعة"
            rows={keep(editionRows)}
            after={volumeDetail && !hidden('volumePagesText') && (
              <VolumeBreakdown
                pages={volumePages}
                parts={volumeParts}
                indexVolumes={indexVolumes}
                years={volumeYears}
                era={book.year_era}
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

          {/* نشراتُ الكتاب الأخرى في المكتبة، ثم ما طُبع معه أو فيه */}
          {!hidden('otherEditions') && <OtherEditions group={editions} />}
          {!hidden('within') && insideTitles.length > 0 && (
            <WithinTitlesPanel
              book={book}
              titles={insideTitles}
              open={showWithin}
              onToggle={() => setShowWithin((v) => !v)}
            />
          )}
          {!hidden('within') && inside.length > 0 && <PrintedWithin books={inside} />}

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

          {/* أدوات البطاقة: رابطُها، وطبعُها، وإحالتُها. لا تُعدِّل شيئًا،
              فهي للزائر كما هي لصاحب المكتبة. */}
          <CardActions book={book} author={author} allIds={books.map((b) => b.id)} />

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

      {/* ورقةُ الطباعة: لا تُرى على الشاشة، وهي وحدها ما يُطبع */}
      <PrintSheet
        book={book}
        author={author}
        sections={[
          { title: 'بيانات الكتاب', rows: keep(bookRows) },
          { title: 'بيانات الطبعة', rows: keep(editionRows) },
          { title: 'بيانات النسخة', rows: keep(copyRows) },
          { title: 'عن الكتاب', rows: keep(aboutRows) },
        ]}
        citation={citationOf(book, author)}
        link={shortBookLink(book.id, books.map((b) => b.id))}
      />

      <Suspense fallback={null}>
        {zoomCover && (
          <ImageViewer url={book.cover_url} name={book.title} onClose={() => setZoomCover(false)} />
        )}
      </Suspense>
    </main>
  )
}

// ---------------------------------------------------------- أدوات البطاقة
function CardActions({ book, author, allIds }: { book: Book; author: Author | null; allIds: string[] }) {
  const { setError } = useLibrary()
  const link = shortBookLink(book.id, allIds)

  return (
    <div className="card-actions">
      <CopyButton
        icon={<LinkIcon size={15} />}
        label="نسخ رابط البطاقة"
        done="نُسخ الرابط"
        value={link}
        onFail={setError}
      />
      <button type="button" className="card-action" onClick={() => window.print()} title="طباعة البطاقة">
        <PrinterIcon size={15} />
        <span>طباعة البطاقة</span>
      </button>
      <CopyButton
        icon={<QuoteIcon size={15} />}
        label="نسخ الإحالة"
        done="نُسخت الإحالة"
        value={citationOf(book, author)}
        onFail={setError}
      />
      <CopyButton
        icon={<CopyIcon size={15} />}
        label="نسخ عنوان الكتاب"
        done="نُسخ العنوان"
        value={book.title}
        onFail={setError}
      />
    </div>
  )
}

// --------------------------------------------------------- ورقة الطباعة
/**
 * ما يُطبع من البطاقة: شعارُ المكتبة واسمُها في الرأس، ثم الغلافُ والعنوان
 * والنسبة، ثم البيانات بأقسامها، ثم الإحالةُ ورابطُ البطاقة في الذيل.
 *
 * وهي مخفيّةٌ على الشاشة، فيطبعها المتصفّح بأنماط `@media print` بلا نافذةٍ
 * جديدة تُفتح ولا صورٍ تُعاد جلبًا.
 *
 * وموضعُها من `document.body` لا من شجرة الصفحة عمدًا: الطباعةُ تُخفي `#root`
 * كلَّه بـ `display: none`، ولو كانت الورقة داخله لاختفت معه. ولو أُخفي بغير
 * ذلك — بالشفافية مثلًا — لبقيت الصفحةُ المخفيّة شاغلةً مواضعَها فخرجت
 * أوراقٌ بيضٌ قبل الورقة وبعدها.
 */
function PrintSheet(
  { book, author, sections, citation, link }: {
    book: Book
    author: Author | null
    sections: { title: string; rows: Row[] }[]
    citation: string
    link: string
  },
) {
  const cover = resolveAsset(book.cover_url)
  const name = author?.full_name?.trim() || author?.name?.trim() || book.author_name

  return createPortal(
    <div className="print-sheet" aria-hidden="true">
      <header className="print-head">
        <img src={resolveAsset('assets/logo.svg') ?? ''} alt="" className="print-logo" />
        <div>
          <div className="print-library">مكتبة سَيْف العشيرة</div>
          <div className="print-sub">بطاقةُ كتابٍ من فهرس المكتبة</div>
        </div>
      </header>

      <div className="print-body">
        {cover && <img src={cover} alt="" className="print-cover" />}
        <div className="print-main">
          <h1 className="print-title">{book.title}</h1>
          {book.subtitle && <div className="print-subtitle">{book.subtitle}</div>}
          {name && (
            <div className="print-author">
              {name}
              {deathLabel(author) && <span> — {deathLabel(author)}</span>}
            </div>
          )}

          {sections.filter((s) => s.rows.length > 0).map((section) => (
            <section key={section.title} className="print-section">
              <h2>{section.title}</h2>
              <dl>
                {section.rows.map((row) => (
                  <div key={row.key}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>

      <footer className="print-foot">
        <div className="print-citation">{citation}</div>
        <div className="print-link">{link}</div>
      </footer>
    </div>,
    document.body,
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
              {/* الصفُّ الممتدّ وحده يُضبط طرفاه: ما فيه نصٌّ مسترسل، وما
                  دونه كلمةٌ أو رقمٌ لا يُضبط */}
              <div style={{
                fontSize: 14, fontWeight: 600, lineHeight: 1.7, overflowWrap: 'anywhere',
                textAlign: row.wide ? 'justify' : undefined,
                textWrap: row.wide ? 'pretty' : undefined,
              }}>
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
/** صفٌّ في لوح النسبة: صفتُه في عمودٍ ثابت، وأصحابُها إلى جانبه */
function AttribRow(
  { icon, label, children }: { icon: ReactNode; label: string; children: ReactNode },
) {
  return (
    <div className="attrib-row">
      <span className="attrib-role">
        <span className="attrib-icon" aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span className="attrib-body">{children}</span>
    </div>
  )
}

function AuthorLine(
  { author, fallbackName, linked, label = 'المُؤلِّف' }:
  { author: Author | null; fallbackName: string; linked: boolean; label?: string },
) {
  // الاسم الكامل بنسبه إن سُجِّل، وإلا فالمختصر الذي يُعرض في القوائم
  const name = author?.full_name?.trim() || author?.name?.trim() || fallbackName
  const death = deathLabel(author)
  if (!name) return null

  return (
    <AttribRow icon={<OwnerIcon size={14} />} label={label}>
      <PersonName name={name} id={author?.id ?? null} linked={linked} />
      {death && (
        <span className="attrib-note">
          <HourglassIcon size={12} />
          {death}
        </span>
      )}
    </AttribRow>
  )
}

/**
 * المشاركون مجموعين بصفاتهم: إذا اجتمع اثنان من صفةٍ واحدة ثُنِّي لفظُها،
 * وإن زادوا جُمِع، وتُعرض أسماؤهم **في سطرٍ واحد** معطوفةً بالواو كما تُكتب
 * في صدر الكتاب: «المحقِّقان: فلانٌ وفلان». وكلُّ صفةٍ سطرٌ على حِدَة، فلا
 * يُقال «المحقِّق ومن معه».
 *
 * وقد يختلف القائمون على المجلَّدات، فيُذكر لكلٍّ نطاقُه إلى جانب اسمه —
 * وحينئذٍ لا تُعطف الأسماء بالواو: هؤلاء ليسوا شركاء في عملٍ واحد بل لكلٍّ
 * عملُه، فيُفصل بينهم بفاصلةٍ تُبيِّن ولا تجمع.
 *
 * ولكلّ اسمٍ صفحتُه: سجلُّ الأشخاص واحد، ومعرّفُ صاحبه محفوظٌ في
 * `person_id`، فالضغطُ عليه يبلغ ترجمتَه وسائرَ ما عمل فيه. ومن لا سجلَّ له
 * — اسمٌ فُهرس قبل الربط — يبقى نصًّا لا رابطَ فيه، ولا يُوهَم القارئُ بباب
 * لا يفتح.
 */
function Contributors({ book, linked }: { book: Book; linked: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; scope: string; id: string | null }[]>()
    for (const c of book.contributors ?? []) {
      const name = c.name.trim()
      if (!name) continue
      map.set(c.role, [
        ...(map.get(c.role) ?? []),
        { name, scope: (c.scope ?? '').trim(), id: c.person_id ?? null },
      ])
    }
    return [...map.entries()]
  }, [book.contributors])

  if (groups.length === 0) return null

  return (
    <>
      {groups.map(([role, people]) => {
        const split = people.some((p) => p.scope)
        return (
          <AttribRow
            key={role}
            icon={<VerifyIcon size={13} />}
            label={contributorLabel(role, people.length)}
          >
            <span className="attrib-people">
              {people.map((p, i) => (
                <span key={`${p.name}-${i}`} className="attrib-person">
                  {/* الواوُ خارج الرابط: هي عاطفةٌ لا من الاسم، فلو دخلت
                      تحته لوُصلت به عند النسخ وتحتها خطُّ الرابط */}
                  {i > 0 && <span className="attrib-join">{split ? '،' : 'و'}</span>}
                  <PersonName name={p.name} id={p.id} linked={linked} />
                  {p.scope && <span className="attrib-scope">{p.scope}</span>}
                </span>
              ))}
            </span>
          </AttribRow>
        )
      })}
    </>
  )
}

/** اسمٌ في لوح النسبة: رابطٌ إلى صفحته إن كان له سجلّ، وإلّا فنصّ */
function PersonName(
  { name, id, linked }: { name: string; id: string | null; linked: boolean },
) {
  if (!linked || !id) return <span className="attrib-name">{name}</span>
  return (
    <a
      className="attrib-name attrib-link"
      href={hashFor({ name: 'author', id })}
      onClick={(e) => { e.preventDefault(); navigate({ name: 'author', id }) }}
    >
      {name}
    </a>
  )
}

/**
 * تفصيل صفحات المجلَّدات، مطويٌّ تحت خانة الإجمالي حتى يُطلب. ومجلَّدات
 * الفهارس تُعلَّم ولا تُحسب في الإجمالي — فهرسٌ لا متن.
 */
function VolumeBreakdown(
  { pages, parts, indexVolumes, years, era, open, onToggle }:
  {
    pages: number[]; parts: string[]; indexVolumes: number[]
    /** سنةُ صدور كلِّ مجلَّد، حين تتفاوت. والصفرُ: لم تُعرف. */
    years: number[]
    era: string
    open: boolean; onToggle: () => void
  },
) {
  const total = sumVolumePages(pages, indexVolumes)
  // «تفصيل صفحات كلّ مجلَّد» لا يصحّ عنوانًا لتفصيلٍ لا صفحاتَ فيه
  const label = total > 0 ? 'تفصيل صفحات كلّ مُجلّد' : 'تفصيل المُجلَّدات'

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
        {label}
      </button>

      {open && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))',
          gap: '8px 16px', marginTop: 12,
        }}>
          {Array.from(
            { length: Math.max(pages.length, years.length, parts.length) },
            (_, i) => i,
          ).map((i) => {
            const count = pages[i] ?? 0
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
                {/* سنةُ المجلَّد لا تُعرض إلا لمن عُرفت سنتُه */}
                {(years[i] ?? 0) > 0 && (
                  <span style={{ fontSize: 11.5, color: 'var(--accent-soft)' }}>
                    {toArabicDigits(yearLabel(years[i], era))}
                  </span>
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
          {total > 0 && (
            <div style={{
              gridColumn: '1 / -1', fontSize: 12.5, color: 'var(--muted)',
              borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2,
            }}>
              الإجمالي: <strong style={{ color: 'var(--text)' }}>{formatNumber(total)}</strong>
              {indexVolumes.length > 0 && ' — بلا صفحات مجلَّدات الفهارس'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * دُورُ النشرة في صفٍّ واحد، لكلٍّ بابُها إلى صفحتها ونطاقُها من الكتاب.
 *
 * والعطفُ يتبع النطاقَ كما يتبعه في المشاركين: الشريكتان في النشرة كلِّها
 * تُعطف إحداهما على الأخرى بالواو — فغلافٌ يحمل شعارَ دارَين خبرٌ عن عملٍ
 * واحد — وأمّا اللتان اقتسمتا مجلَّداتِه فلكلٍّ عملُها، فيُفصل بينهما
 * بفاصلةٍ تُبيِّن ولا تجمع.
 *
 * ولا يُكتب الرابطُ إلا لدارٍ لها صفحةٌ تُعرض فعلًا، فلا يُوهَم القارئُ
 * ببابٍ لا يفتح.
 */
function Presses(
  { presses, shown }: { presses: ReturnType<typeof pressesOf>; shown: Set<string> },
) {
  const split = presses.some((p) => p.scope)
  return (
    <span className="attrib-people">
      {presses.map((press, i) => (
        <span key={`${press.name}-${i}`} className="attrib-person">
          {i > 0 && <span className="attrib-join">{split ? '،' : 'و'}</span>}
          {press.id && shown.has(press.id) ? (
            <a
              className="row-link"
              href={hashFor({ name: 'publisher', id: press.id })}
              onClick={(e) => { e.preventDefault(); navigate({ name: 'publisher', id: press.id! }) }}
            >
              {press.name}
            </a>
          ) : (
            <span>{press.name}</span>
          )}
          {press.scope && <span className="attrib-scope">{toArabicDigits(press.scope)}</span>}
        </span>
      ))}
    </span>
  )
}

// -------------------------------------------------------------- صلات الكتب
/**
 * نشراتُ الكتاب الأخرى في المكتبة.
 *
 * والنشرتان لكتابٍ واحد عنوانٌ واحد لا عنوانان، فتشتركان بالضرورة في العنوان
 * واسم المؤلِّف — ولذلك لا يُعرض ههنا عنوانٌ ولا مؤلِّف، هما فوقُ في صدر
 * البطاقة. وتختلفان فيما سواهما: لكلٍّ محقِّقُها ودارُها ومجلَّداتُها وصفحاتُها
 * وغلافُها وموضعُها من الرفّ وسطرُ ملاحظاتها. فتُعرض كلُّ نشرةٍ بتمام ما
 * تنفرد به، لا سطرًا يُنقَر: من وقف على إحداهما فإنما يريد المقابلة بينهما.
 */
function OtherEditions({ group }: { group: ReturnType<typeof editionGroup> }) {
  const { of, others } = group
  if (!of && others.length === 0) return null

  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead
        icon={<PressIcon size={16} />}
        title={of ? 'نشرةٌ أخرى من كتابٍ في المكتبة' : 'نشراتٌ أخرى للكتاب'}
      />

      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 11, lineHeight: 1.9 }}>
        {of
          ? 'والنشرةُ المُعتمَدة من هذا الكتاب عندنا هي:'
          : 'الكتابُ واحد وعنوانُه واحد، والنشرةُ غيرُ النشرة: لكلٍّ محقِّقُها ودارُها ومجلَّداتُها.'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...(of ? [of] : []), ...others].map((target) => (
          <EditionPanel key={target.id} book={target} main={!!of} />
        ))}
      </div>
    </section>
  )
}

/**
 * لوحُ نشرةٍ أخرى: غلافُها إلى جانب ما تنفرد به من بيانات، ثم سطرُ ملاحظاتها.
 *
 * والغلافُ صغيرٌ ههنا لا كغلاف الصفحة: هو للتمييز بين النشرتين بالنظر، فذاك
 * أسرعُ ما يُفرَّق به بينهما.
 */
function EditionPanel({ book, main }: { book: Book; main: boolean }) {
  const { authorById, settings, isOwner } = useLibrary()
  const vis = settings.visibility
  const hidden = (key: string) => settings.hidden_fields.includes(key)

  const presses = pressesOf(book)
  const span = volumeYearSpan(book)
  const issue = issueBadge(book)

  const facts: { label: string; value: ReactNode; key: string }[] = [
    { key: 'publisher', label: presses.length > 1 ? 'دُور النَّشْر' : 'دار النَّشْر', value: pressesLine(book) },
    { key: 'yearLabel', label: span ? 'سنوات النَّشْر' : 'سنة النَّشْر', value: span || publishYear(book) },
    {
      key: 'edition',
      label: 'الطبعة',
      value: book.edition + (book.edition_notes ? ` (${book.edition_notes})` : ''),
    },
    {
      key: 'volumes',
      label: 'المُجلَّدات',
      value: book.single_volume ? 'مُجلَّدٌ واحد' : formatNumber(book.volumes),
    },
    { key: 'pages', label: 'عدد الصفحات', value: formatNumber(book.pages) },
    { key: 'size', label: 'حجْم الكتاب', value: book.size },
    { key: 'binding', label: 'نوع التَّغْليف', value: book.binding },
    { key: 'condition', label: 'الحالة المادِّيَّة', value: book.condition },
    {
      key: 'cabinet',
      label: 'موضعُها من المكتبة',
      value: book.cabinet_no
        ? `دولاب ${book.cabinet_no}${book.shelf_no ? ` / رفّ ${book.shelf_no}` : ''}`
        : '',
    },
  ].filter((f) => !hidden(f.key) && filled(f.value))

  return (
    <div
      // واللوحُ كلُّه بابٌ إلى صفحة النشرة، إلا ما كان في جوفه بابًا إلى
      // غيرها: اسمُ المحقِّق يذهب إلى صفحته، فلا يُخطَف النقرُ منه
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return
        navigate({ name: 'book', id: book.id })
      }}
      className="edition-panel"
      title="افتح صفحة هذه النشرة"
    >
      <div className="edition-panel-cover">
        <ImageSlot url={book.cover_url} folder="covers" canEdit={false} placeholder="غلاف النشرة" />
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-soft)' }}>
            {main ? 'النشرةُ المُعتمَدة' : 'نشرةٌ أخرى'}
          </span>
          {issue && !hidden('issueKind') && (
            <span className="book-flag book-flag-issue" title={issueLine(book)}>{issue}</span>
          )}
        </div>

        {/* ذوو الصفات أوّلُ ما يُفرَّق به بين النشرتين: هي نشرةُ فلانٍ وتلك
            نشرةُ فلان. ولا يُعرض ههنا مؤلِّفٌ: هو مؤلِّفُ الكتاب نفسِه. */}
        {!hidden('contributors') && (book.contributors ?? []).length > 0 && (
          <section className="attrib attrib-tight">
            <Contributors book={book} linked={isOwner || vis.authors} />
          </section>
        )}

        {facts.length > 0 && (
          <div className="edition-panel-facts">
            {facts.map((f) => (
              <div key={f.key} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ولكلّ نشرةٍ ملاحظاتُها: هي فيها لا في أختها */}
        {(isOwner || vis.notes) && book.notes.trim() && (
          <div className="prose" style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.95 }}>
            {book.notes}
          </div>
        )}

        {/* والوفاةُ تُقرأ من سجلّ المؤلِّف نفسِه، فلا تُعاد ههنا */}
        {authorById(book.author_id) === null && book.author_name.trim() && (
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{book.author_name}</div>
        )}
      </div>
    </div>
  )
}

/**
 * ما طُبع مع الكتاب أو فيه من العناوين، قسمًا مطويًّا.
 *
 * ومطويٌّ عن قصد: المجموعةُ تضمّ عشرين عنوانًا وأكثر، فلو بُسطت كلُّها لطالت
 * البطاقةُ حتى يضيع ما بعدها. ويُذكر عددُها في ترويسته، فيُعلم ما وراءه قبل
 * أن يُفتح.
 */
function WithinTitlesPanel(
  { book, titles, open, onToggle }: {
    book: Book
    titles: WithinTitle[]
    open: boolean
    onToggle: () => void
  },
) {
  const { authorById, settings, isOwner } = useLibrary()
  const linked = isOwner || settings.visibility.authors

  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead icon={<WithinIcon size={16} />} title={`${withinLabelOf(book)} من الكتب`} />

      <button type="button" onClick={onToggle} className="within-toggle" aria-expanded={open}>
        <ChevronIcon size={13} />
        <span>
          {countLabel(titles.length, BOOKS_COUNT)}
          {isCollection(book)
            ? ' طُبعت في هذه المجموعة، لكلٍّ منها مؤلِّفُه'
            : ' طُبعت مع هذا الكتاب في نشرةٍ واحدة'}
        </span>
      </button>

      {open && (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '11px 0 9px', lineHeight: 1.9 }}>
            وهي كتبٌ تُعدّ في المكتبة كلُّ واحدٍ منها كتابًا، وليس لها من الورق
            شيءٌ على حِدَة — فبياناتُ الطبعة والنسخة أعلاه هي بياناتُها.
          </div>

          <ol className="within-list">
            {titles.map((t, i) => (
              <li key={`${t.title}-${i}`}>
                <span className="within-list-no">{formatNumber(i + 1)}</span>
                <span className="within-list-body">
                  <span className="within-list-title">
                    {t.title}
                    {t.is_matn && <span className="within-list-matn">مَتْنٌ دَرْسيّ</span>}
                  </span>
                  <span className="within-list-marks">
                    {t.author_name.trim() && (
                      <span>
                        <PersonName
                          name={t.author_name}
                          id={t.author_id ?? null}
                          linked={linked}
                        />
                        {deathLabel(authorById(t.author_id ?? null))
                          && ` (${deathLabel(authorById(t.author_id ?? null))})`}
                      </span>
                    )}
                    {(t.contributors ?? []).filter((c) => c.name.trim()).map((c, ci) => (
                      <span key={`${c.name}-${ci}`}>
                        {contributorLabel(c.role, 1)}: {c.name.trim()}
                      </span>
                    ))}
                    {t.category && <span>{t.category}</span>}
                  </span>
                </span>
                {(t.at ?? '').trim() && (
                  <span className="within-list-at">{toArabicDigits(t.at!.trim())}</span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

/**
 * ما طُبع ضمن هذا الكتاب من الكتب: كالمتون في «برنامج مهمّات العلم». وكلُّ
 * واحدٍ منها كتابٌ مستقلٌّ بعنوانه ومؤلِّفه، لا مجلَّدٌ منه ولا فصلٌ فيه.
 */
function PrintedWithin({ books }: { books: Book[] }) {
  return (
    <section style={{ ...cardStyle, borderRadius: 12, padding: '15px 18px 17px', marginBottom: 16 }}>
      <SectionHead icon={<ArchiveIcon size={16} />} title="طُبِع ضمنه من الكتب" />
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 11, lineHeight: 1.9 }}>
        {countLabel(books.length, BOOKS_COUNT)}، لكلٍّ منها في الفهرس صفحتُه —
        فهي كتبٌ مستقلَّة وإن جمعها مجلَّدٌ واحد.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {books.map((b) => (
          <div
            key={b.id}
            onClick={() => navigate({ name: 'book', id: b.id })}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 10, cursor: 'pointer', flexWrap: 'wrap',
              background: 'var(--header)', border: '1px solid var(--border)',
              borderRadius: 9, padding: '9px 12px',
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.title}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{b.author_name}</span>
            {b.within_pages.trim() && (
              <span style={{ fontSize: 11.5, color: 'var(--accent-soft)' }}>
                {toArabicDigits(b.within_pages.trim())}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

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
/**
 * الفوائد والمقتطفات. والصندوقُ لا يُعرض إلا إذا كان فيه شيء: بطاقةٌ تُخبر
 * أن لا فائدة فيها ليست خبرًا، وإنما هي فراغٌ يشغل موضعًا.
 *
 * وصاحبُ المكتبة يبقى له سبيلٌ إلى الإضافة حين لا فائدة بعدُ: زرٌّ مفردٌ لا
 * صندوقٌ كامل، فإذا فُتح فُتح النموذجُ وحده.
 */
/**
 * صندوقُ الفوائد في صفحة الكتاب: ما خرج من هذا الكتاب منها.
 *
 * **وكلُّ فائدةٍ مصدرُها كتابٌ مفهرَس تُعرض ههنا**: تُقيَّد من الكنّاش أو من
 * هذه الصفحة، ثم تجتمع في بطاقة كتابها على كل حال.
 *
 * وهو عرضٌ لا نموذجُ إدخال: الفائدةُ تُكتب في نافذتها حيثما كانت — من هنا أو
 * من سيل الكنّاش — فسلوكُ كل حقلٍ مكتوبٌ مرّةً واحدة في `PerkEditor`، ولا
 * يفترق نصفُ نموذجٍ ههنا عن نموذجٍ تامٍّ هناك.
 *
 * ولا يُعرض فارغًا: بطاقةٌ تُخبر أن لا فائدة فيه ليست خبرًا. ويبقى لصاحب
 * المكتبة زرٌّ مفردٌ يفتح النموذج.
 */
function PerksPanel({ bookId, perks }: { bookId: string; perks: Perk[] }) {
  const { canEdit } = useLibrary()
  const [editing, setEditing] = useState<Perk | null | undefined>(undefined)

  // الأنواعُ تُقرأ من الفوائد نفسها لا من قائمةٍ ثابتة: صاحبُ المكتبة
  // يُحرِّرها، ولا يسقط عدٌّ لأن نوعًا رُفع من القائمة
  const counts = [...new Set(perks.flatMap((p) => p.kinds))]
    .map((kind) => ({ kind, n: perks.filter((p) => p.kinds.includes(kind)).length }))
    .filter(({ n }) => n > 0)

  if (perks.length === 0 && !canEdit) return null

  return (
    <div className="book-perks">
      {perks.length === 0 ? (
        <button type="button" onClick={() => setEditing(null)} style={ghostButtonStyle}>
          + قيِّد فائدةً من هذا الكتاب
        </button>
      ) : (
        <>
          <div className="book-perks-head">
            <div>
              <h2>ما قُيِّد منه من فوائد</h2>
              <p>
                {counts.map(({ kind, n }) => `${formatNumber(n)} ${kind}`).join('، و')}
              </p>
            </div>
            <div className="book-perks-tools">
              <button
                type="button"
                className="card-action"
                onClick={() => navigate({ name: 'perks' })}
                title="كنّاش المكتبة كلُّه"
              >
                <PerkIcon size={15} />
                <span>الكنّاش كلُّه</span>
              </button>
              {canEdit && (
                <button type="button" onClick={() => setEditing(null)} style={ghostButtonStyle}>
                  + فائدةٌ جديدة
                </button>
              )}
            </div>
          </div>

          <div className="perk-list">
            {perks.map((p) => (
              <PerkCard
                key={p.id}
                perk={p}
                hideSource
                onEdit={canEdit ? setEditing : undefined}
              />
            ))}
          </div>
        </>
      )}

      {editing !== undefined && (
        <PerkEditor
          key={editing?.id ?? 'new'}
          perk={editing}
          bookId={bookId}
          onClose={() => setEditing(undefined)}
        />
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

/**
 * تاريخ الوُرود: يقبل اليومَ بخلاف سنة النشر — يومُ الوُرود يُعرف، ويومُ
 * الطبعة لا يُعرف. ويبقى الشهرُ واليوم اختياريَّين.
 */
function acquiredLabel(book: Book): string {
  if (book.acquired_approx) return book.acquired_text
  if (book.acquired_year == null) return ''
  const year = `${toArabicDigits(book.acquired_year)} هـ`
  if (!book.acquired_month) return year
  const month = `${HIJRI_MONTHS[book.acquired_month - 1]} ${year}`
  return book.acquired_day ? `${toArabicDigits(book.acquired_day)} ${month}` : month
}
