// نموذج الكتاب: يخدم الإضافة والتعديل جميعًا. فهرسة كاملة على طريقة
// المكتبات، في خمسة أقسام.
//
// وصفحةُ الكتاب عرضٌ لا تعديل — سوى التقييم وحالة القراءة — وقلمُ التعديل
// فيها يفتح هذا النموذج مملوءًا ببيانات الكتاب. فسلوك كل حقلٍ مكتوبٌ هنا
// مرةً واحدة: منتقي السنة، وتحويلُ رقم الطبعة، وقفلُ مكان الدار، وصفوفُ
// المؤلِّفين والمشاركين.
//
// الفارق بين «الأجزاء» و«المجلَّدات» مقصود: الأول تقسيم المؤلِّف، والثاني
// مجلَّدات هذه الطبعة، وهو وحده ما يُبنى عليه كعوب الرفّ وصفحاتُ كل مجلَّد.
//
// وتاريخ وفاة المؤلِّف يُسأل عنه هنا وإن كان من بيانات المؤلِّف لا الكتاب:
// عليه يقوم ترتيب الكتب بأقدمية أصحابها، وطلبُه ساعةَ كتابة الاسم أيسر من
// العودة إليه بعدُ في صفحة المؤلِّف.

import { useMemo, useState, type FormEvent } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  BINDINGS, CONDITIONS, CONTRIBUTOR_ROLES, DEFAULT_CONDITION, LANGUAGES,
  MISSING_REASONS, ORIGINAL_LANGUAGES, SIZES, SOURCES, SOURCE_DETAILS,
  WORK_PHRASES, WORK_TYPES,
  editionInWords, formatNumber, missingVolumesHeadline, ordinalName, parseNumber,
  sumVolumePages, type Category, type Contributor, type MissingVolume,
} from '../lib/types'
import HijriYearPicker, { type HijriYear } from '../components/HijriYearPicker'
import ImageSlot from '../components/ImageSlot'
import {
  BackButton, Combobox, RiyalGlyph, SectionHeading, TagIcon,
  cardStyle, primaryButtonStyle,
} from '../components/ui'

const inputStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, width: '100%',
} as const

const lockedStyle = { ...inputStyle, background: 'var(--header)', color: 'var(--muted)' } as const

const labelStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, color: 'var(--muted)',
}

const checkStyle = {
  display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, whiteSpace: 'nowrap' as const,
}

const row2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 } as const
const row3 = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 } as const
const row21 = { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14 } as const

/** مؤلِّفٌ في النموذج: اسمُه ووفاتُه كما تُدخَل قبل أن تُحفظ في صفحته */
interface AuthorRow {
  name: string
  alive: boolean
  approx: boolean
  death: string
  text: string
}

const EMPTY_AUTHOR: AuthorRow = { name: '', alive: false, approx: false, death: '', text: '' }
const EMPTY_YEAR: HijriYear = { year: null, month: null, day: null, approx: false, text: '' }

const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

/**
 * رقم الطبعة يُحفظ مكتوبًا («الثانية»)، فيُستردّ رقمًا بالبحث في العشرات
 * القليلة الأولى — أهونُ من حقلٍ ثانٍ في المخطّط لا يُقرأ إلا هنا.
 */
function editionNumberOf(text: string): string {
  for (let n = 1; n <= 99; n++) if (editionInWords(n) === text) return String(n)
  return text
}

export default function AddBook({ bookId }: { bookId?: string }) {
  const { authors, books, works, publishers, categories, settings, run, reload } = useLibrary()

  // الكتاب المُعدَّل، إن كنّا في التعديل. القيم الأولى تُقرأ منه مرةً واحدة.
  const editing = bookId ? books.find((b) => b.id === bookId) ?? null : null

  /** صفُّ مؤلِّفٍ مملوءٌ بوفاته المسجَّلة في صفحته */
  function rowFor(name: string): AuthorRow {
    const known = authors.find((a) => a.name === name.trim())
    if (!known) return { ...EMPTY_AUTHOR, name }
    return {
      name,
      alive: known.alive,
      approx: known.death_approx,
      death: str(known.death),
      text: known.death_text,
    }
  }

  // ---------------------------------------------------------- ١. بيانات الكتاب
  const [title, setTitle] = useState(() => editing?.title ?? '')
  const [authorRows, setAuthorRows] = useState<AuthorRow[]>(() => {
    if (!editing) return [EMPTY_AUTHOR]
    const names = [editing.author_name, ...(editing.co_authors ?? []).map((c) => c.name)]
      .filter((n) => n.trim())
    return names.length ? names.map(rowFor) : [EMPTY_AUTHOR]
  })
  const [subtitle, setSubtitle] = useState(() => editing?.subtitle ?? '')
  const [contribRows, setContribRows] = useState<Contributor[]>(
    () => (editing?.contributors?.length
      ? editing.contributors.map((c) => ({ ...c }))
      : [{ role: CONTRIBUTOR_ROLES[0], name: '' }]),
  )
  const [series, setSeries] = useState(() => editing?.series ?? '')
  const [seriesNo, setSeriesNo] = useState(() => editing?.series_no ?? '')
  const [category, setCategory] = useState(() => editing?.category ?? '')
  const [subCategory, setSubCategory] = useState(() => editing?.sub_category ?? '')
  // تصنيفٌ كتبه الفاهرس هنا ولمّا يُحفظ بعدُ: يظهر في المربَّعات مختارًا،
  // ولا يدخل تصنيفات المكتبة إلا مع حفظ الكتاب. رئيسًا كان أو فرعًا.
  const [pendingCategories, setPendingCategories] = useState<Category[]>(() => {
    const known = (name: string) => categories.some((c) => c.name === name)
    const out: Category[] = []
    if (editing?.category && !known(editing.category)) {
      out.push({ name: editing.category, parent: '' })
    }
    if (editing?.sub_category && !known(editing.sub_category)) {
      out.push({ name: editing.sub_category, parent: editing.category ?? '' })
    }
    return out
  })

  // --------------------------------------------------------- ٢. بيانات الطبعة
  const [publisherName, setPublisherName] = useState(() => editing?.publisher ?? '')
  const [place, setPlace] = useState(() => editing?.place ?? '')
  const [year, setYear] = useState<HijriYear>(() => (editing
    ? { year: editing.year, month: editing.year_month, approx: editing.year_approx, text: editing.year_text }
    : EMPTY_YEAR))
  const [editionNo, setEditionNo] = useState(
    () => (editing?.edition_worded ? editionNumberOf(editing.edition) : editing?.edition ?? ''),
  )
  const [editionWorded, setEditionWorded] = useState(() => editing?.edition_worded ?? false)
  const [editionNotes, setEditionNotes] = useState(() => editing?.edition_notes ?? '')
  const [size, setSize] = useState(() => editing?.size || SIZES[1])
  const [parts, setParts] = useState(() => str(editing?.parts))
  const [singlePart, setSinglePart] = useState(() => editing?.single_part ?? false)
  const [volumes, setVolumes] = useState(() => str(editing?.volumes))
  const [singleVolume, setSingleVolume] = useState(() => editing?.single_volume ?? false)
  const [volumePages, setVolumePages] = useState<string[]>(
    () => (editing?.volume_pages ?? []).map((v) => String(v)),
  )
  // ما اشتمل عليه كل مجلَّد من أسفار المؤلِّف: قد يجمع المجلَّدُ الرابعُ
  // الأسفارَ الخامسَ والسادسَ والسابع، ويقتصر الخامسُ على الثامن وحده.
  const [volumeParts, setVolumeParts] = useState<string[]>(
    () => (editing?.volume_parts ?? []).map((v) => String(v)),
  )
  // مجلَّدات الفهارس: تُعلَّم فلا تُحسب صفحاتُها في الإجمالي — فهرسٌ لا متن
  const [indexVolumes, setIndexVolumes] = useState<number[]>(
    () => [...(editing?.index_volumes ?? [])],
  )
  // ما نقص من مجلَّدات الطبعة: يُعلَّم رقمُه، ويُكتب سببُ فقده — والسببُ
  // يجوز أن يُترك، فيُكتفى بأنه ناقص
  const [missingVolumes, setMissingVolumes] = useState<MissingVolume[]>(
    () => (editing?.missing_volumes ?? []).map((m) => ({ ...m })),
  )
  const [pages, setPages] = useState(() => str(editing?.pages))
  const [isbn, setIsbn] = useState(() => editing?.isbn ?? '')
  const [language, setLanguage] = useState(() => editing?.language || LANGUAGES[0])
  const [languageOriginal, setLanguageOriginal] = useState(
    () => editing?.language_original || ORIGINAL_LANGUAGES[0],
  )

  // --------------------------------------------------------- ٣. بيانات النسخة
  const [cabinetNo, setCabinetNo] = useState(() => editing?.cabinet_no ?? '')
  const [shelfNo, setShelfNo] = useState(() => editing?.shelf_no ?? '')
  const [binding, setBinding] = useState(() => editing?.binding || BINDINGS[0])
  const [condition, setCondition] = useState(() => editing?.condition || DEFAULT_CONDITION)
  const [conditionNotes, setConditionNotes] = useState(() => editing?.condition_notes ?? '')
  const [value, setValue] = useState(() => (editing?.value ? String(editing.value) : ''))
  // الفارغ صفةُ ورودٍ «غير مُحدَّدة»، وهو الأصل: لا يُلزَم أحدٌ بما لا يعرف
  const [source, setSource] = useState(() => editing?.source ?? '')
  const [sourceDetail, setSourceDetail] = useState(() => editing?.source_detail ?? '')
  const [acquired, setAcquired] = useState<HijriYear>(() => (editing
    ? {
      year: editing.acquired_year,
      month: editing.acquired_month,
      day: editing.acquired_day ?? null,
      approx: editing.acquired_approx,
      text: editing.acquired_text,
    }
    : EMPTY_YEAR))
  const [marginNote, setMarginNote] = useState(() => editing?.margin_note ?? '')

  // ----------------------------------------------------------- ٤. عن الكتاب
  const [tags, setTags] = useState(() => (editing?.tags ?? []).join('، '))
  const [keywords, setKeywords] = useState(() => (editing?.keywords ?? []).join('، '))
  const [topic, setTopic] = useState(() => editing?.topic ?? '')
  const [blurb, setBlurb] = useState(() => editing?.blurb ?? '')
  const [notes, setNotes] = useState(() => editing?.notes ?? '')

  // ------------------------------------------------- ٥. ارتباطه بكتبٍ أخرى
  const [workTargetId, setWorkTargetId] = useState('')
  const [workType, setWorkType] = useState(WORK_TYPES[0])
  const [newWorks, setNewWorks] = useState<{ target_book_id: string; type: string }[]>([])

  const [coverUrl, setCoverUrl] = useState<string | null>(() => editing?.cover_url ?? null)
  /**
   * كَعْبٌ واحد للكتاب كلِّه، لا كعبٌ لكل مجلَّد: كعوب المجلَّدات في الطبعة
   * الواحدة صورةٌ واحدة لا تختلف إلا برقمها، فتُرفع مرةً وتُكرَّر على الرفّ
   * ويُوضع على كل واحدٍ منها رقمُ مجلَّده. ويبقى `spine_images` سجلًّا كما
   * هو في المخطّط، مفتاحُه «1» لا غير.
   */
  const [spine, setSpine] = useState<string | null>(
    () => editing?.spine_images?.['1'] ?? null,
  )
  const [saving, setSaving] = useState(false)

  /** صلاتُ هذا الكتاب المحفوظة، تُعرض في التعديل ويمكن فكُّها */
  const savedWorks = editing ? works.filter((w) => w.book_id === editing.id) : []

  // الدار المعروفة يأتي مكانُها معها، ولا يُعدَّل من هنا بل من صفحة دُور النشر
  const knownPublisher = useMemo(
    () => publishers.find((p) => p.name === publisherName.trim()) ?? null,
    [publishers, publisherName],
  )

  // قوائم ما في المكتبة، تُعرض في الحقول التي تقبل الجديد والمُختار جميعًا
  const authorNames = useMemo(() => authors.map((a) => a.name), [authors])
  const publisherNames = useMemo(() => publishers.map((p) => p.name), [publishers])
  const seriesNames = useMemo(
    () => [...new Set(books.map((b) => b.series.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')),
    [books],
  )
  /**
   * من يُقترَح في حقل الصفة: سجلُّ الأشخاص كلُّه — مؤلِّفوه ومحقِّقوه سواء —
   * ومعه من عُرف بصفةٍ في كتابٍ سابق ولمّا يُنشأ له سجلّ بعدُ. فالرجلُ
   * الواحد يُصاب اسمُه من حقل المؤلِّف ومن حقل الصفة جميعًا.
   */
  const contributorNames = useMemo(() => {
    const found = new Set<string>(authors.map((a) => a.name))
    books.forEach((b) => (b.contributors ?? []).forEach((c) => {
      if (c.name.trim()) found.add(c.name.trim())
    }))
    return [...found].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [authors, books])

  const volumeCount = singleVolume ? 1 : Math.min(40, Math.max(1, parseNumber(volumes) ?? 1))
  const manyVolumes = !singleVolume && volumeCount > 1
  // مجلَّدات الفهارس خارج الحساب، وما جاوز العددَ المُدخَل لا يُعتدّ به
  const volumeSum = sumVolumePages(volumePages.slice(0, volumeCount), indexVolumes)

  /** ما نقص من المجلَّدات، مقصورًا على ما دخل في العدد المُدخَل */
  const liveMissing = missingVolumes.filter((m) => m.no >= 1 && m.no <= volumeCount)
  const missingOf = (no: number) => missingVolumes.find((m) => m.no === no)

  function toggleMissing(no: number) {
    setMissingVolumes((prev) => (prev.some((m) => m.no === no)
      ? prev.filter((m) => m.no !== no)
      : [...prev, { no, reason: '' }]))
  }

  function setMissingReason(no: number, reason: string) {
    setMissingVolumes((prev) => prev.map((m) => (m.no === no ? { ...m, reason } : m)))
  }

  /**
   * ما يُقال تحت اسم المؤلِّف. وهو خبرٌ عمّا سيقع، فلا يُقال في التعديل:
   * الكتاب في صفحة مؤلِّفه من قبلُ، فلا شيء «سيُضاف».
   */
  const authorHint = useMemo(() => {
    if (editing) return ''
    const trimmed = authorRows[0]?.name.trim()
    if (!trimmed) return ''
    return authors.some((a) => a.name === trimmed)
      ? 'سيُضاف الكتاب إلى صفحة هذا المؤلِّف'
      : 'مؤلِّفٌ جديد، ستُنشأ له صفحة خاصة'
  }, [authorRows, authors, editing])

  const ready = !!(title.trim() && authorRows[0]?.name.trim())

  function patchAuthorRow(i: number, patch: Partial<AuthorRow>) {
    setAuthorRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  /** اسمٌ معروفٌ تأتي معه وفاتُه المسجَّلة، فلا تُكتب مرّتين */
  function fillFromKnownAuthor(i: number, name: string) {
    const known = authors.find((a) => a.name === name.trim())
    if (!known) { patchAuthorRow(i, { name }); return }
    patchAuthorRow(i, {
      name,
      alive: known.alive,
      approx: known.death_approx,
      death: known.death === null ? '' : String(known.death),
      text: known.death_text,
    })
  }

  function patchContrib(i: number, patch: Partial<Contributor>) {
    setContribRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    try {
      // المؤلِّفون: يُنشأون أو يُلحق بهم، وتُحفظ وفاةُ كلٍّ في صفحته
      const filled = authorRows.filter((r) => r.name.trim())
      const saved: { author_id: string; name: string }[] = []
      for (const row of filled) {
        const author = await api.findOrCreateAuthor(row.name)
        await api.setAuthorDeath(author.id, {
          death: row.alive || row.approx ? null : parseNumber(row.death),
          era: 'هـ',
          alive: row.alive,
          approx: row.approx,
          text: row.text.trim(),
        })
        saved.push({ author_id: author.id, name: author.name })
      }
      const [mainAuthor, ...coAuthors] = saved

      // المشاركون: لكلٍّ سجلُّه في سجلّ الأشخاص — وهو جدول المؤلِّفين نفسه —
      // فتُجمع في صفحةٍ واحدة تحقيقاتُه ومؤلَّفاتُه، ويُصاب اسمُه بالبحث في
      // حقل المؤلِّف كما يُصاب في حقل الصفة.
      const filledContribs = contribRows.filter((c) => c.name.trim())
      const contributors: Contributor[] = []
      for (const row of filledContribs) {
        const person = await api.findOrCreateAuthor(row.name)
        contributors.push({
          role: row.role,
          name: person.name,
          // نطاقُ عمله من الكتاب يُحفظ إن كُتب، والفراغُ فيه: الكتاب كلّه
          scope: (row.scope ?? '').trim(),
          person_id: person.id,
        })
      }

      // الدار: تُنشأ بمكانها أوّل مرة، ثم يأتي مكانُها منها في كل كتابٍ بعده
      let publisherId: string | null = null
      let publisherPlace = place.trim()
      if (publisherName.trim()) {
        const row = await api.findOrCreatePublisher(publisherName, place)
        publisherId = row.id
        publisherPlace = row.place
      }

      const trimmedCategory = category.trim()
      // الفرعُ لا يُحفظ بغير رئيسه: من رفع الرئيسَ رُفع فرعُه معه
      const trimmedSub = trimmedCategory ? subCategory.trim() : ''
      const known = (name: string) => categories.some((c) => c.name === name)
      if (trimmedCategory && !known(trimmedCategory)) {
        await api.addCategory(trimmedCategory, categories.length)
      }
      if (trimmedSub && !known(trimmedSub)) {
        await api.addCategory(trimmedSub, categories.length + 1, trimmedCategory)
      }

      // صفحات المجلَّدات تُحفظ بطول عدد المجلَّدات تمامًا، فموضعُ كل رقمٍ هو
      // رقمُ مجلَّده. ولو رُشِّح الفارغ منها لانزاح ما بعده عن موضعه.
      const volPages = manyVolumes
        ? Array.from({ length: volumeCount }, (_, i) => parseNumber(volumePages[i]) ?? 0)
        : []
      const volParts = manyVolumes
        ? Array.from({ length: volumeCount }, (_, i) => (volumeParts[i] ?? '').trim())
        : []
      const indexVols = manyVolumes
        ? indexVolumes.filter((n) => n >= 1 && n <= volumeCount).sort((a, b) => a - b)
        : []
      // المجلَّد الواحد لا ينقص منه مجلَّد، فلا تُحفظ له قائمة
      const missingVols = manyVolumes
        ? liveMissing
          .slice()
          .sort((a, b) => a.no - b.no)
          .map((m) => ({ no: m.no, reason: m.reason.trim() }))
        : []

      const fields: api.BookInput = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        author_id: mainAuthor?.author_id ?? null,
        author_name: mainAuthor?.name ?? '',
        co_authors: coAuthors,
        contributors,
        series: series.trim(),
        series_no: seriesNo.trim(),
        category: trimmedCategory,
        sub_category: trimmedSub,

        publisher_id: publisherId,
        publisher: publisherName.trim(),
        place: publisherPlace,
        year: year.approx ? null : year.year,
        year_month: year.approx ? null : year.month,
        year_era: 'هـ',
        year_approx: year.approx,
        year_text: year.approx ? year.text.trim() : '',
        edition: editionWorded ? editionInWords(editionNo) : editionNo.trim(),
        edition_worded: editionWorded,
        edition_notes: editionNotes.trim(),
        size,
        parts: singlePart ? 1 : parseNumber(parts),
        single_part: singlePart,
        volumes: singleVolume ? 1 : parseNumber(volumes),
        single_volume: singleVolume,
        volume_pages: volPages,
        volume_parts: volParts,
        index_volumes: indexVols,
        missing_volumes: missingVols,
        // مجموع صفحات المجلَّدات يُحسب، ولا يُكتب باليد إلا في المجلَّد الواحد
        pages: manyVolumes ? (volumeSum > 0 ? volumeSum : null) : parseNumber(pages),
        isbn: isbn.trim(),
        language,
        language_original: language === LANGUAGES[1] ? languageOriginal : '',

        cabinet_no: cabinetNo.trim(),
        shelf_no: shelfNo.trim(),
        binding,
        condition,
        condition_notes: conditionNotes.trim(),
        value: parseNumber(value) ?? 0,
        source,
        source_detail: SOURCE_DETAILS[source] ? sourceDetail.trim() : '',
        acquired_day: acquired.approx ? null : (acquired.day ?? null),
        acquired_month: acquired.approx ? null : acquired.month,
        acquired_year: acquired.approx ? null : acquired.year,
        acquired_approx: acquired.approx,
        acquired_text: acquired.approx ? acquired.text.trim() : '',
        margin_note: marginNote.trim(),

        topic: topic.trim(),
        tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        keywords: keywords.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        blurb: blurb.trim(),
        notes: notes.trim(),

        cover_url: coverUrl,
        // الكعب المرفوع، وبه يُفعَّل عرضُه على الرف. مفتاحُه «1» لا غير:
        // صورةٌ واحدة تُكرَّر على مجلَّدات الكتاب كلِّها.
        spine_images: spine ? { '1': spine } : {},
        use_spine: !!spine,
      }

      const id = editing ? (await api.updateBook(editing.id, fields), editing.id)
        : (await api.insertBook(fields)).id

      if (newWorks.length) await api.insertWorks(id, newWorks)
      await reload()
      navigate({ name: 'book', id })
    } catch (err) {
      await run(async () => { throw err })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-main" style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      {editing && (
        <BackButton label="العودة إلى صفحة الكتاب" onClick={() => navigate({ name: 'book', id: editing.id })} />
      )}

      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        {editing ? 'تعديل بيانات الكتاب' : 'إضافة كتابٍ إلى الفهرس'}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        {editing
          ? `صحِّح ما شئتَ من بيانات «${editing.title}»، ثم احفظ.`
          : 'أضف معلومات الكتاب كلِّها، وفصِّل واستقصِ ما أمكنَ ذلك.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="add-grid"
        style={{
          ...cardStyle, display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)',
          gap: 28, borderRadius: 14, padding: 26,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="add-cover" style={{ width: '100%', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden' }}>
            <ImageSlot
              url={coverUrl}
              folder="covers"
              canEdit
              placeholder="غلاف الكتاب (اختياري)"
              onUploaded={(url) => setCoverUrl(url)}
            />
          </div>

          {/* الكعب هو ما يُعرض في «عرض الأرفف»: كعوب الكتب مصفوفةً كما تُرى في
              المكتبة. وهو صورةٌ واحدة للكتاب كلِّه — كعوب مجلَّدات الطبعة
              الواحدة لا تختلف إلا برقمها — فتُكرَّر على عدد المجلَّدات ويُوضع
              على كل واحدٍ منها رقمُ مجلَّده في دائرة. */}
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 8 }}>
              كَعْب الكتاب (اختياري)، يُعرَض في «عرض الأرفف».
              {volumeCount > 1 && ` وتُكرَّر الصورة على مجلَّداته الـ${volumeCount} برقم كلِّ مجلَّد.`}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 46, height: 168, borderRadius: 4, overflow: 'hidden', flex: 'none' }}>
                <ImageSlot
                  url={spine}
                  folder="spines"
                  canEdit
                  placeholder="كعب"
                  onUploaded={(url) => setSpine(url)}
                />
              </div>
              {spine && (
                <button
                  type="button"
                  onClick={() => setSpine(null)}
                  style={{
                    border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
                    borderRadius: 8, padding: '5px 10px', fontSize: 11.5,
                  }}
                >
                  إزالة الكعب
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ------------------------------------------------ ١. بيانات الكتاب */}
          <SectionHeading>١. بيانات الكتاب</SectionHeading>

          <label style={labelStyle}>
            عنوان الكتاب
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </label>

          {authorRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto',
                gap: 10, alignItems: 'start',
              }}
              className="form-row"
            >
              <label style={labelStyle}>
                {i === 0 ? 'المُؤلِّف' : `المُؤلِّف ${i + 1}`}
                <Combobox
                  value={row.name}
                  onChange={(name) => fillFromKnownAuthor(i, name)}
                  options={authorNames}
                  placeholder="اكتب اسمًا جديدًا أو اختر من مؤلِّفي المكتبة"
                />
                {i === 0 && authorHint && (
                  <span style={{ fontSize: 11, color: 'var(--accent-soft)' }}>{authorHint}</span>
                )}
              </label>

              <div style={{ ...labelStyle, gap: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  تاريخ وفاة المُؤلِّف
                  <label style={checkStyle}>
                    <input
                      type="checkbox"
                      checked={row.alive}
                      onChange={(e) => patchAuthorRow(i, { alive: e.target.checked })}
                    />
                    مُعاصِر
                  </label>
                  {!row.alive && (
                    <label style={checkStyle}>
                      <input
                        type="checkbox"
                        checked={row.approx}
                        onChange={(e) => patchAuthorRow(i, { approx: e.target.checked })}
                      />
                      تاريخٌ تقريبي
                    </label>
                  )}
                </span>

                {/* المعاصِر لا وفاة له، والمجهولةُ وفاتُه تُكتب نصًّا */}
                {row.alive ? (
                  <span style={{ fontSize: 12, color: 'var(--accent-soft)', padding: '9px 0' }}>
                    مؤلِّفٌ معاصِرٌ حيّ
                  </span>
                ) : row.approx ? (
                  <input
                    value={row.text}
                    onChange={(e) => patchAuthorRow(i, { text: e.target.value })}
                    placeholder="مثال: نحو ١٠٦٠ هـ، أو: القرن الرابع"
                    style={inputStyle}
                  />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      value={row.death}
                      onChange={(e) => patchAuthorRow(i, { death: e.target.value })}
                      inputMode="numeric"
                      placeholder="السنة"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ fontSize: 13 }}>هـ</span>
                  </span>
                )}
              </div>

              {/* الاشتراك في التأليف نادرٌ في القديم، فالزرّ صغيرٌ لا حقلٌ دائم */}
              {i === authorRows.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setAuthorRows((prev) => [...prev, EMPTY_AUTHOR])}
                  title="إضافة مؤلِّفٍ آخر"
                  aria-label="إضافة مؤلِّفٍ آخر"
                  style={plusStyle}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthorRows((prev) => prev.filter((_, idx) => idx !== i))}
                  title="حذف هذا المؤلِّف"
                  aria-label="حذف هذا المؤلِّف"
                  style={{ ...plusStyle, color: 'var(--muted)', borderColor: 'var(--border)' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <label style={labelStyle}>
            العنوان الفرعي
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="اسم الكتاب كاملًا كما سمّاه مؤلِّفه، إن كان يُعرف بغيره"
              style={inputStyle}
            />
          </label>

          {/* قد يجتمع في الكتاب محقِّقان ومخرِّجٌ وثلاثة تقديمات، فلكلٍّ سطرُه.
              وقد يختلف القائمون على مجلَّداته: يُحقِّق الأولَ رجلٌ والثانيَ
              غيرُه، فلكلٍّ حقلُ نطاقه — يُكتب فيه ما عمل فيه من المجلَّدات أو
              الأسفار، ويُترك فارغًا لمن عمل في الكتاب كلِّه. */}
          {contribRows.map((row, i) => (
            <div
              key={i}
              className="form-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1.1fr) auto',
                gap: 10, alignItems: 'end',
              }}
            >
              <label style={labelStyle}>
                {i === 0 ? 'الصِّفة' : ''}
                <select
                  value={row.role}
                  onChange={(e) => patchContrib(i, { role: e.target.value })}
                  aria-label="صفة المشارِك"
                  style={inputStyle}
                >
                  {CONTRIBUTOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                {i === 0 ? 'الاسم' : ''}
                <Combobox
                  value={row.name}
                  onChange={(name) => patchContrib(i, { name })}
                  options={contributorNames}
                  placeholder="اكتب اسمًا جديدًا أو اختر ممّن في المكتبة"
                />
              </label>
              <label style={labelStyle}>
                {i === 0 ? 'ما عمل فيه' : ''}
                <input
                  value={row.scope ?? ''}
                  onChange={(e) => patchContrib(i, { scope: e.target.value })}
                  placeholder="الكتاب كلّه"
                  title="ما عمل فيه من المجلَّدات أو الأسفار — يُترك فارغًا لمن عمل في الكتاب كلِّه"
                  aria-label="ما عمل فيه من المجلَّدات أو الأسفار"
                  style={inputStyle}
                />
              </label>
              {i === contribRows.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setContribRows((prev) => [
                    ...prev,
                    // الصفة تُورَث عن السطر الذي قبله: أكثرُ ما يُضاف مشارِكٌ
                    // ثانٍ على الصفة نفسها في مجلَّدٍ آخر
                    { role: prev[prev.length - 1]?.role ?? CONTRIBUTOR_ROLES[0], name: '', scope: '' },
                  ])}
                  title="إضافة مشارِكٍ آخر"
                  aria-label="إضافة مشارِكٍ آخر"
                  style={plusStyle}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setContribRows((prev) => prev.filter((_, idx) => idx !== i))}
                  title="حذف هذا المشارِك"
                  aria-label="حذف هذا المشارِك"
                  style={{ ...plusStyle, color: 'var(--muted)', borderColor: 'var(--border)' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* بيانُ الحقل مرةً واحدةً تحت الصفوف، لا في كل سطر */}
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: -6, lineHeight: 1.8 }}>
            «ما عمل فيه» لمن اقتصر عملُه على بعض الكتاب: اكتب فيه «١-٣» أو
            «السِّفر الأول» أو «المجلَّد الأخير». والفراغُ فيه معناه: عمل في
            الكتاب كلِّه.
          </div>

          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              اسم السلسلة
              <Combobox
                value={series}
                onChange={setSeries}
                options={seriesNames}
                placeholder="اكتب سلسلةً جديدة أو اختر من سلاسل المكتبة"
              />
            </label>
            <label style={labelStyle}>
              رقمه في السلسلة
              <input value={seriesNo} onChange={(e) => setSeriesNo(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {/* التصنيفات مربَّعاتٌ تُرى كلُّها بنظرةٍ واحدة، لا قائمةٌ تُفتح:
              تصنيفات المكتبة معدودة، والاختيار من المرئيّ أسرع من التذكّر. */}
          <CategoryPicker
            category={category}
            subCategory={subCategory}
            onCategory={(name) => { setCategory(name); setSubCategory('') }}
            onSubCategory={setSubCategory}
            known={categories}
            extra={pendingCategories}
            onAdd={(name, parent) => setPendingCategories((prev) => (
              prev.some((c) => c.name === name) || categories.some((c) => c.name === name)
                ? prev
                : [...prev, { name, parent }]
            ))}
          />

          {/* ----------------------------------------------- ٢. بيانات الطبعة */}
          <SectionHeading>٢. بيانات الطبعة</SectionHeading>

          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              دار النَّشْر
              <Combobox
                value={publisherName}
                onChange={(name) => {
                  setPublisherName(name)
                  const known = publishers.find((p) => p.name === name.trim())
                  // مكان الدار يتبعها: يُملأ منها، ويُفرَّغ إن غُيِّر اسمُها
                  if (known) setPlace(known.place)
                  else if (knownPublisher) setPlace('')
                }}
                options={publisherNames}
                placeholder="اكتب اسم الدار أو اخترها"
                emptyHint={editing ? undefined : 'دارٌ جديدة، سيُنشأ لها سجلّ في «دُوْر النَّشْر»'}
              />
            </label>
            <label style={labelStyle}>
              بلد النَّشْر
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                readOnly={!!knownPublisher}
                title={knownPublisher ? 'بلد الدار يُعدَّل من صفحة دُوْر النَّشْر' : undefined}
                style={knownPublisher ? lockedStyle : inputStyle}
              />
              {knownPublisher && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  يُعدَّل من صفحة «دُوْر النَّشْر»
                </span>
              )}
            </label>
          </div>

          <div className="form-row" style={row2}>
            <HijriYearPicker label="سنة النَّشْر" value={year} onChange={setYear} />

            <div style={{ ...labelStyle, gap: 6 }}>
              رقم الطبعة
              <span style={{ display: 'flex', gap: 8 }}>
                <input
                  value={editionWorded ? editionInWords(editionNo) : editionNo}
                  onChange={(e) => setEditionNo(e.target.value)}
                  readOnly={editionWorded}
                  inputMode="numeric"
                  placeholder="مثال: ٢"
                  style={editionWorded ? { ...lockedStyle, flex: 1 } : { ...inputStyle, flex: 1 }}
                />
                {/* صحٌّ يحوّل الرقم كتابةً ويقفل الحقل، وقلمٌ يعيده رقمًا */}
                <button
                  type="button"
                  onClick={() => setEditionWorded((v) => !v)}
                  disabled={!editionWorded && !editionNo.trim()}
                  title={editionWorded ? 'تعديل رقم الطبعة' : 'تحويل الرقم كتابةً'}
                  aria-label={editionWorded ? 'تعديل رقم الطبعة' : 'تحويل الرقم كتابةً'}
                  style={{
                    ...plusStyle,
                    color: editionWorded ? 'var(--muted)' : 'var(--accent)',
                    borderColor: editionWorded ? 'var(--border)' : 'var(--accent)',
                    opacity: !editionWorded && !editionNo.trim() ? 0.45 : 1,
                  }}
                >
                  {editionWorded ? '✎' : '✓'}
                </button>
              </span>
            </div>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              ملاحظات الطبعة
              <input
                value={editionNotes}
                onChange={(e) => setEditionNotes(e.target.value)}
                placeholder="مثال: مَزِيدة، مُنقَّحة"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              حجْم الكتاب
              <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
                {SIZES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row" style={row2}>
            <div style={{ ...labelStyle, gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                عدد الأَجْزاء أو الأَسْفار
                <label style={checkStyle}>
                  <input
                    type="checkbox"
                    checked={singlePart}
                    onChange={(e) => setSinglePart(e.target.checked)}
                  />
                  جزءٌ واحد
                </label>
              </span>
              {!singlePart && (
                <input
                  value={parts}
                  onChange={(e) => setParts(e.target.value)}
                  inputMode="numeric"
                  placeholder="مثال: ١٠"
                  style={inputStyle}
                />
              )}
            </div>

            <div style={{ ...labelStyle, gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                عدد المُجلَّدات
                <label style={checkStyle}>
                  <input
                    type="checkbox"
                    checked={singleVolume}
                    onChange={(e) => setSingleVolume(e.target.checked)}
                  />
                  مُجلَّد واحد
                </label>
              </span>
              {!singleVolume && (
                <input
                  value={volumes}
                  onChange={(e) => setVolumes(e.target.value)}
                  inputMode="numeric"
                  placeholder="مثال: ٥"
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          {/* تفصيل المجلَّدات، صفٌّ لكل مجلَّد: صفحاتُه، وما اشتمل عليه من
              أسفار المؤلِّف، وهل هو مجلَّد فهارس. ومجلَّد الفهارس لا تُحسب
              صفحاتُه في الإجمالي، فيسقط حقلُ صفحاته أصلًا. */}
          {manyVolumes && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>تفصيل المُجلَّدات</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.8 }}>
                صفحاتُ كلِّ مجلَّد، وما اشتمل عليه من أسفار المؤلِّف وأجزائه
                (مثل: ٥-٧، أو: الثامن). ومجلَّدات الفهارس تُعلَّم فلا تُحسب
                صفحاتُها في الإجمالي.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {Array.from({ length: volumeCount }, (_, i) => {
                  const volume = i + 1
                  const isIndex = indexVolumes.includes(volume)
                  const gone = missingOf(volume)
                  return (
                    <div key={i}>
                      <div
                        className="form-row"
                        style={{
                          display: 'grid', gridTemplateColumns: '74px 110px minmax(0,1fr) auto auto',
                          gap: 10, alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>المُجلَّد {volume}</span>
                        <input
                          value={volumePages[i] ?? ''}
                          onChange={(e) => setVolumePages((prev) => {
                            const next = prev.slice()
                            next[i] = e.target.value
                            return next
                          })}
                          placeholder="صفحات"
                          inputMode="numeric"
                          aria-label={`صفحات المجلَّد ${volume}`}
                          style={{ ...inputStyle, padding: '7px 10px', borderRadius: 7, fontSize: 13 }}
                        />
                        <input
                          value={volumeParts[i] ?? ''}
                          onChange={(e) => setVolumeParts((prev) => {
                            const next = prev.slice()
                            next[i] = e.target.value
                            return next
                          })}
                          placeholder="ما فيه من الأسفار (اختياري)"
                          aria-label={`أسفار المجلَّد ${volume}`}
                          style={{ ...inputStyle, padding: '7px 10px', borderRadius: 7, fontSize: 13 }}
                        />
                        <label style={{ ...checkStyle, fontSize: 11.5, color: 'var(--muted)' }}>
                          <input
                            type="checkbox"
                            checked={isIndex}
                            onChange={(e) => setIndexVolumes((prev) => (
                              e.target.checked
                                ? [...prev, volume]
                                : prev.filter((n) => n !== volume)
                            ))}
                          />
                          فهارس
                        </label>
                        {/* النقص يُعلَّم في سطر المجلَّد نفسه: هو خبرٌ عنه لا
                            قائمةٌ على حِدَة تُعاد فيها أرقامُه */}
                        <label style={{ ...checkStyle, fontSize: 11.5, color: gone ? 'var(--danger)' : 'var(--muted)' }}>
                          <input
                            type="checkbox"
                            checked={!!gone}
                            onChange={() => toggleMissing(volume)}
                          />
                          ناقص
                        </label>
                      </div>

                      {gone && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                          margin: '6px 84px 2px 0',
                        }}>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>سببُ فقده:</span>
                          <input
                            list="missing-reasons"
                            value={gone.reason}
                            onChange={(e) => setMissingReason(volume, e.target.value)}
                            placeholder="اتركه فارغًا فيُكتفى بأنه ناقص"
                            aria-label={`سبب فقد المجلَّد ${volume}`}
                            style={{
                              ...inputStyle, flex: '1 1 200px', width: 'auto',
                              padding: '6px 10px', borderRadius: 7, fontSize: 12.5,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* أسبابٌ مقترَحة لا محصورة: يُكتب غيرُها في الحقل نفسه */}
              <datalist id="missing-reasons">
                {MISSING_REASONS.map((r) => <option key={r} value={r} />)}
              </datalist>

              <div style={{
                fontSize: 12.5, color: 'var(--muted)', marginTop: 12,
                paddingTop: 10, borderTop: '1px solid var(--border)',
              }}>
                الإجمالي: <strong style={{ color: 'var(--text)' }}>{formatNumber(volumeSum)}</strong>
                {indexVolumes.length > 0 && ` — بلا ${indexVolumes.length} مجلَّد فهارس`}
              </div>

              {liveMissing.length > 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 6 }}>
                  {missingVolumesHeadline(liveMissing.length)}:{' '}
                  {liveMissing
                    .slice()
                    .sort((a, b) => a.no - b.no)
                    .map((m) => `المجلَّد ${ordinalName(m.no)}`)
                    .join('، و')}
                </div>
              )}
            </div>
          )}

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              {manyVolumes ? 'عدد الصفحات إجمالًا' : 'عدد الصفحات'}
              {/* المجموع في المجلَّدات حسابٌ لا إدخال */}
              <input
                value={manyVolumes ? (volumeSum > 0 ? formatNumber(volumeSum) : '') : pages}
                onChange={(e) => setPages(e.target.value)}
                readOnly={manyVolumes}
                inputMode="numeric"
                placeholder={manyVolumes ? 'يُجمع من صفحات المجلَّدات' : ''}
                style={manyVolumes ? lockedStyle : inputStyle}
              />
            </label>
            <label style={labelStyle}>
              ردمك (ISBN)
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} dir="ltr" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              اللغة
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          </div>

          {language === LANGUAGES[1] && (
            <label style={{ ...labelStyle, maxWidth: 300 }}>
              اللغة الأَصْل
              <select
                value={languageOriginal}
                onChange={(e) => setLanguageOriginal(e.target.value)}
                style={inputStyle}
              >
                {ORIGINAL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          )}

          {/* ----------------------------------------------- ٣. بيانات النسخة */}
          <SectionHeading>٣. بيانات النسخة</SectionHeading>

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              رقم الدولاب
              <input
                value={cabinetNo}
                onChange={(e) => setCabinetNo(e.target.value)}
                placeholder="مثال: ٣"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              رقم الرَّفّ
              <input
                value={shelfNo}
                onChange={(e) => setShelfNo(e.target.value)}
                placeholder="مثال: ٢"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              نوع التَّغْليف
              <select value={binding} onChange={(e) => setBinding(e.target.value)} style={inputStyle}>
                {BINDINGS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              الحالة المادِّيَّة
              <select value={condition} onChange={(e) => setCondition(e.target.value)} style={inputStyle}>
                {CONDITIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>قيمة الكتاب</span>
                {settings.currency === 'ريال' ? <RiyalGlyph /> : <span>({settings.currency})</span>}
              </span>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              صِفَة الوُرُود
              {/* الفراغ خيارٌ قائم: لا يُلزَم الفاهرس بصفةٍ لا يعرفها */}
              <select
                value={source}
                onChange={(e) => { setSource(e.target.value); setSourceDetail('') }}
                style={inputStyle}
              >
                <option value="">غير مُحدَّدة</option>
                {SOURCES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          {/* ملاحظاتُ الحالة: القائمةُ فوقها كلمةٌ واحدة، وحالُ النسخة قد
              تحتاج بيانًا — أثرُ رطوبةٍ في مجلَّد، أو خرمٌ في ورقة. */}
          <label style={labelStyle}>
            ملاحظاتٌ على الحالة المادِّيَّة
            <textarea
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="مثال: أثرُ رطوبةٍ في طرف المجلَّد الثاني، والباقي سليم"
              style={{ ...inputStyle, minHeight: 62, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>

          <div className="form-row" style={row2}>
            {/* الشِّراء يستدعي مكانَه، والإهداءُ مُهدِيَه، والإرثُ مَوروثَه */}
            {SOURCE_DETAILS[source] && (
              <label style={labelStyle}>
                {SOURCE_DETAILS[source]}
                <input
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  style={inputStyle}
                />
              </label>
            )}
            {/* تاريخُ الوُرود يُعرف يومُه — بخلاف سنة النشر — فيقبل الأيام */}
            <HijriYearPicker label="تاريخ الوُرود" value={acquired} onChange={setAcquired} withDay />
          </div>

          <label style={labelStyle}>
            طُرَّة الكتاب
            <textarea
              value={marginNote}
              onChange={(e) => setMarginNote(e.target.value)}
              placeholder="ما خُطَّ على طُرَّة الكتاب بخطّ اليد: سطر الإهداء، وتملُّك من قبلنا، ونحوه…"
              style={{ ...inputStyle, minHeight: 70, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>

          {/* ------------------------------------------------- ٤. عن الكتاب */}
          <SectionHeading>٤. عن الكتاب</SectionHeading>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              وُسوم (مفصولة بفاصلة)
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="مثال: تراث، مرجع، مُهدى" style={inputStyle} />
            </label>
            {/* الكلمات المفتاحية سبيلٌ إلى الكتاب في البحث لا خبرٌ عنه،
                فلا تُعرض على بطاقته وسومًا كما تُعرض الوُسوم */}
            <label style={labelStyle}>
              كلمات مفتاحية (مفصولة بفاصلة)
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="ما يُبحَث به عن الكتاب ولا يُعرض على بطاقته"
                style={inputStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            موضوعٌ مُختصَر
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} />
          </label>

          <label style={labelStyle}>
            نبذة عن الكتاب
            <textarea
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="موضوعه، ومنهج مؤلفه فيه، ومكانته بين الكتب…"
              style={{ ...inputStyle, minHeight: 80, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>

          <label style={labelStyle}>
            ملاحظات
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>

          {/* -------------------------------------- ٥. ارتباطه بكُتُبٍ أخرى */}
          <SectionHeading>٥. ارتباطه بكُتُبٍ أخرى</SectionHeading>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -6 }}>
            إن كان هذا الكتاب شرحًا أو حاشيةً أو اختصارًا لكتابٍ عندنا فاربطه به، ويمكن ربطه بأكثر من كتاب.
          </div>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) auto', gap: 10, alignItems: 'end' }}>
            <label style={labelStyle}>
              الكتاب الأصل
              <select value={workTargetId} onChange={(e) => setWorkTargetId(e.target.value)} style={inputStyle}>
                <option value="">اختر كتابًا من المكتبة</option>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              نوع العمل
              <select value={workType} onChange={(e) => setWorkType(e.target.value)} style={inputStyle}>
                {/* القيمةُ نوعُ العمل مجرَّدًا كما يُحفظ، والمعروضُ صياغتُه
                    بحرفه — فيرى الفاهرسُ الجملةَ التي ستُكتب قبل أن يربط */}
                {WORK_TYPES.map((o) => (
                  <option key={o} value={o}>{WORK_PHRASES[o] ?? o}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (!workTargetId) return
                setNewWorks((prev) =>
                  prev.some((w) => w.target_book_id === workTargetId && w.type === workType)
                    ? prev
                    : [...prev, { target_book_id: workTargetId, type: workType }])
              }}
              style={{
                border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
              }}
            >
              ربط
            </button>
          </div>

          {savedWorks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {savedWorks.map((w) => (
                <span key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'var(--header)',
                  borderRadius: 999, padding: '5px 8px 5px 13px', fontSize: 12.5,
                }}>
                  {/* حرفُ الجرّ يتبع نوع العمل ولا يُقاس: «شرحٌ لـ»،
                      «حاشيةٌ على»، «انتقاءٌ من». ومصدرُه `WORK_PHRASES`
                      نفسُها التي تقرؤها بطاقةُ الكتاب، فلا يفترق اللفظُ
                      بين موضع الإدخال وموضع العرض. */}
                  {WORK_PHRASES[w.type] ?? w.type}: {books.find((b) => b.id === w.target_book_id)?.title ?? '—'}
                  <button
                    type="button"
                    aria-label="فكّ هذه الصلة"
                    title="فكّ هذه الصلة"
                    onClick={() => void run(async () => {
                      await api.deleteWork(w.id)
                      await reload()
                    })}
                    style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {newWorks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {newWorks.map((w, i) => (
                <span key={`${w.target_book_id}-${w.type}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'var(--header)',
                  borderRadius: 999, padding: '5px 8px 5px 13px', fontSize: 12.5,
                }}>
                  {/* حرفُ الجرّ يتبع نوع العمل ولا يُقاس: «شرحٌ لـ»،
                      «حاشيةٌ على»، «انتقاءٌ من». ومصدرُه `WORK_PHRASES`
                      نفسُها التي تقرؤها بطاقةُ الكتاب، فلا يفترق اللفظُ
                      بين موضع الإدخال وموضع العرض. */}
                  {WORK_PHRASES[w.type] ?? w.type}: {books.find((b) => b.id === w.target_book_id)?.title ?? '—'}
                  <button
                    type="button"
                    aria-label="إزالة"
                    onClick={() => setNewWorks((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <button type="submit" disabled={!ready || saving} style={{ ...primaryButtonStyle(ready && !saving), marginTop: 6 }}>
            {saving ? '…جارٍ الحفظ' : editing ? 'حفظ التعديل' : 'إضافة إلى المكتبة'}
          </button>
        </div>
      </form>
    </main>
  )
}

const plusStyle = {
  border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
  borderRadius: 8, width: 38, height: 38, fontSize: 17, lineHeight: 1,
  flex: 'none', alignSelf: 'end', marginBottom: 1,
} as const

/**
 * التصنيف: مربَّعاتٌ تُعرض فيها تصنيفات المكتبة كلُّها، يُختار منها واحد —
 * فالكتاب لا ينتمي إلا إلى تصنيفٍ واحد — ومعها زرٌّ لتصنيفٍ جديد. الجديد
 * يظهر مختارًا في الحال، ولا يدخل تصنيفات المكتبة إلا مع حفظ الكتاب.
 *
 * ولكل رئيسٍ فروعُه: تُعرض بعد اختياره وحده، فيُختار منها فرعٌ إن كان له
 * فرع. والاثنان يُحفظان في الكتاب، فيُصفَّى بالرئيس وحده أو بالفرع معه.
 */
function CategoryPicker(
  { category, subCategory, onCategory, onSubCategory, known, extra, onAdd }: {
    category: string
    subCategory: string
    onCategory: (v: string) => void
    onSubCategory: (v: string) => void
    known: Category[]
    extra: Category[]
    onAdd: (name: string, parent: string) => void
  },
) {
  // ما يُضاف الآن: `null` لا شيء، و`''` رئيسٌ جديد، وغيرُهما فرعٌ تحت اسمه
  const [adding, setAdding] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const all = [...known, ...extra.filter((e) => !known.some((k) => k.name === e.name))]
  const mains = all.filter((c) => !c.parent).map((c) => c.name)
  const subs = category ? all.filter((c) => c.parent === category).map((c) => c.name) : []

  function commit(parent: string) {
    const name = draft.trim()
    setDraft('')
    setAdding(null)
    if (!name) return
    onAdd(name, parent)
    if (parent) onSubCategory(name)
    else onCategory(name)
  }

  const chip = (name: string, on: boolean, onClick: () => void) => (
    <button
      key={name}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        background: on ? 'color-mix(in oklch, var(--accent) 12%, transparent)' : 'var(--bg)',
        color: on ? 'var(--text)' : 'var(--muted)',
        fontWeight: on ? 700 : 400, fontSize: 13,
        borderRadius: 9, padding: '7px 12px',
      }}
    >
      {/* مربَّع الاختيار مرسومٌ لا أصليّ، ليتّسق مع لون المكتبة */}
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 15, height: 15, borderRadius: 4, flex: 'none', fontSize: 11,
        border: on ? 'none' : '1.5px solid var(--border)',
        background: on ? 'var(--accent)' : 'transparent',
        color: 'var(--on-accent)',
      }}>
        {on ? '✓' : ''}
      </span>
      {name}
    </button>
  )

  const addButtonFor = (parent: string, label: string) => (
    <button
      type="button"
      onClick={() => { setDraft(''); setAdding(parent) }}
      style={{
        border: '1px dashed var(--accent)', background: 'none', color: 'var(--accent)',
        borderRadius: 9, padding: '7px 12px', fontSize: 13, fontWeight: 600,
      }}
    >
      {label}
    </button>
  )

  const addField = (parent: string) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(parent) }
          if (e.key === 'Escape') { setDraft(''); setAdding(null) }
        }}
        placeholder={parent ? `اسم الفرع الجديد تحت «${parent}»` : 'اسم التصنيف الرئيس الجديد'}
        style={{ ...inputStyle, flex: '1 1 200px', width: 'auto' }}
      />
      <button
        type="button"
        onClick={() => commit(parent)}
        disabled={!draft.trim()}
        style={{
          border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)',
          borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600,
          opacity: draft.trim() ? 1 : 0.45,
        }}
      >
        إضافة
      </button>
      <button
        type="button"
        onClick={() => { setDraft(''); setAdding(null) }}
        style={{
          border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
          borderRadius: 8, padding: '9px 14px', fontSize: 13,
        }}
      >
        إلغاء
      </button>
    </div>
  )

  return (
    <div style={{ ...labelStyle, gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <TagIcon size={14} />
        التصنيف
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {mains.map((name) => chip(
          name,
          category.trim() === name,
          () => onCategory(category.trim() === name ? '' : name),
        ))}
        {adding !== '' && addButtonFor('', '+ إضافة تصنيف رئيس')}
      </div>

      {adding === '' && addField('')}

      {/* الفروع لا تُعرض إلا بعد اختيار رئيسها: لو عُرضت كلُّها معًا لازدحمت */}
      {category.trim() && (
        <div style={{
          marginTop: 2, paddingInlineStart: 12,
          borderInlineStart: '2px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            التصنيف الفرعيّ تحت «{category.trim()}» (اختياري)
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {subs.map((name) => chip(
              name,
              subCategory.trim() === name,
              () => onSubCategory(subCategory.trim() === name ? '' : name),
            ))}
            {adding !== category.trim() && addButtonFor(category.trim(), '+ إضافة فرع')}
          </div>
          {adding === category.trim() && addField(category.trim())}
        </div>
      )}
    </div>
  )
}
