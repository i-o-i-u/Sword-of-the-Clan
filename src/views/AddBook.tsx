// إضافة كتابٍ إلى الفهرس: فهرسة كاملة على طريقة المكتبات، في خمسة أقسام.
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
  BINDINGS, CONDITIONS, CONTRIBUTOR_ROLES, LANGUAGES, ORIGINAL_LANGUAGES, SIZES,
  SOURCES, SOURCE_DETAILS, WORK_TYPES,
  editionInWords, parseNumber, type Contributor,
} from '../lib/types'
import HijriYearPicker, { type HijriYear } from '../components/HijriYearPicker'
import ImageSlot from '../components/ImageSlot'
import { RiyalGlyph, SectionHeading, cardStyle, primaryButtonStyle } from '../components/ui'

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
const EMPTY_YEAR: HijriYear = { year: null, month: null, approx: false, text: '' }

export default function AddBook() {
  const { authors, books, publishers, categories, settings, run, reload } = useLibrary()

  // ---------------------------------------------------------- ١. بيانات الكتاب
  const [title, setTitle] = useState('')
  const [authorRows, setAuthorRows] = useState<AuthorRow[]>([EMPTY_AUTHOR])
  const [subtitle, setSubtitle] = useState('')
  const [contribRows, setContribRows] = useState<Contributor[]>(
    [{ role: CONTRIBUTOR_ROLES[0], name: '' }],
  )
  const [series, setSeries] = useState('')
  const [seriesNo, setSeriesNo] = useState('')
  const [category, setCategory] = useState(categories[0] ?? '')

  // --------------------------------------------------------- ٢. بيانات الطبعة
  const [publisherName, setPublisherName] = useState('')
  const [place, setPlace] = useState('')
  const [year, setYear] = useState<HijriYear>(EMPTY_YEAR)
  const [editionNo, setEditionNo] = useState('')
  const [editionWorded, setEditionWorded] = useState(false)
  const [editionNotes, setEditionNotes] = useState('')
  const [size, setSize] = useState(SIZES[1])
  const [parts, setParts] = useState('')
  const [singlePart, setSinglePart] = useState(false)
  const [volumes, setVolumes] = useState('')
  const [singleVolume, setSingleVolume] = useState(false)
  const [volumePages, setVolumePages] = useState<string[]>([])
  const [pages, setPages] = useState('')
  const [isbn, setIsbn] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [languageOriginal, setLanguageOriginal] = useState(ORIGINAL_LANGUAGES[0])

  // --------------------------------------------------------- ٣. بيانات النسخة
  const [cabinetNo, setCabinetNo] = useState('')
  const [shelfNo, setShelfNo] = useState('')
  const [binding, setBinding] = useState(BINDINGS[0])
  const [condition, setCondition] = useState(CONDITIONS[1])
  const [value, setValue] = useState('')
  const [source, setSource] = useState(SOURCES[0])
  const [sourceDetail, setSourceDetail] = useState('')
  const [acquired, setAcquired] = useState<HijriYear>(EMPTY_YEAR)
  const [marginNote, setMarginNote] = useState('')

  // ----------------------------------------------------------- ٤. عن الكتاب
  const [tags, setTags] = useState('')
  const [topic, setTopic] = useState('')
  const [blurb, setBlurb] = useState('')
  const [notes, setNotes] = useState('')

  // ------------------------------------------------- ٥. ارتباطه بكتبٍ أخرى
  const [workTargetId, setWorkTargetId] = useState('')
  const [workType, setWorkType] = useState(WORK_TYPES[0])
  const [newWorks, setNewWorks] = useState<{ target_book_id: string; type: string }[]>([])

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [spineUrl, setSpineUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // الدار المعروفة يأتي مكانُها معها، ولا يُعدَّل من هنا بل من صفحة دُور النشر
  const knownPublisher = useMemo(
    () => publishers.find((p) => p.name === publisherName.trim()) ?? null,
    [publishers, publisherName],
  )

  const volumeCount = singleVolume ? 1 : Math.min(40, Math.max(1, parseNumber(volumes) ?? 1))
  const manyVolumes = !singleVolume && volumeCount > 1
  const volumeSum = volumePages
    .slice(0, volumeCount)
    .reduce((sum, v) => sum + (parseNumber(v) ?? 0), 0)

  const authorHint = useMemo(() => {
    const trimmed = authorRows[0]?.name.trim()
    if (!trimmed) return ''
    return authors.some((a) => a.name === trimmed)
      ? 'سيُضاف الكتاب إلى صفحة هذا المؤلِّف'
      : 'مؤلِّفٌ جديد، ستُنشأ له صفحة خاصة'
  }, [authorRows, authors])

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

      // الدار: تُنشأ بمكانها أوّل مرة، ثم يأتي مكانُها منها في كل كتابٍ بعده
      let publisherId: string | null = null
      let publisherPlace = place.trim()
      if (publisherName.trim()) {
        const row = await api.findOrCreatePublisher(publisherName, place)
        publisherId = row.id
        publisherPlace = row.place
      }

      const trimmedCategory = category.trim()
      if (trimmedCategory && !categories.includes(trimmedCategory)) {
        await api.addCategory(trimmedCategory, categories.length)
      }

      const volPages = manyVolumes
        ? volumePages.slice(0, volumeCount).map((v) => parseNumber(v)).filter((n): n is number => n != null)
        : []

      const book = await api.insertBook({
        title: title.trim(),
        subtitle: subtitle.trim(),
        author_id: mainAuthor?.author_id ?? null,
        author_name: mainAuthor?.name ?? '',
        co_authors: coAuthors,
        contributors: contribRows
          .filter((c) => c.name.trim())
          .map((c) => ({ role: c.role, name: c.name.trim() })),
        series: series.trim(),
        series_no: seriesNo.trim(),
        category: trimmedCategory,

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
        // مجموع صفحات المجلَّدات يُحسب، ولا يُكتب باليد إلا في المجلَّد الواحد
        pages: manyVolumes ? (volumeSum > 0 ? volumeSum : null) : parseNumber(pages),
        isbn: isbn.trim(),
        language,
        language_original: language === LANGUAGES[1] ? languageOriginal : '',

        cabinet_no: cabinetNo.trim(),
        shelf_no: shelfNo.trim(),
        binding,
        condition,
        value: parseNumber(value) ?? 0,
        source,
        source_detail: SOURCE_DETAILS[source] ? sourceDetail.trim() : '',
        acquired_month: acquired.approx ? null : acquired.month,
        acquired_year: acquired.approx ? null : acquired.year,
        acquired_approx: acquired.approx,
        acquired_text: acquired.approx ? acquired.text.trim() : '',
        margin_note: marginNote.trim(),

        topic: topic.trim(),
        tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        blurb: blurb.trim(),
        notes: notes.trim(),

        cover_url: coverUrl,
        // كعب المجلَّد الأول، وبه يُفعَّل عرض الكعوب على الرف
        spine_images: spineUrl ? { '1': spineUrl } : {},
        use_spine: !!spineUrl,
      })

      if (newWorks.length) await api.insertWorks(book.id, newWorks)
      await reload()
      navigate({ name: 'book', id: book.id })
    } catch (err) {
      await run(async () => { throw err })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-main" style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        إضافة كتابٍ إلى الفهرس
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        أضف معلومات الكتاب كلِّها، وفصِّل واستقصِ ما أمكنَ ذلك.
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
              المكتبة. وكعوب بقيّة المجلَّدات تُرفع من صفحة الكتاب بعد حفظه. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 170, borderRadius: 4, overflow: 'hidden', flex: 'none' }}>
              <ImageSlot
                url={spineUrl}
                folder="spines"
                canEdit
                placeholder="كعب الكتاب"
                onUploaded={(url) => setSpineUrl(url)}
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7 }}>
              صورة كَعْب الكتاب (اختياري).
              <br />
              تُعرَض في «عرض الأرفف» مرتَّبةً مع كعوب الكتب.
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
                <input
                  value={row.name}
                  onChange={(e) => fillFromKnownAuthor(i, e.target.value)}
                  list="known-authors"
                  placeholder="اكتب اسمًا جديدًا أو اختر من مؤلِّفي المكتبة"
                  style={inputStyle}
                />
                {i === 0 && <span style={{ fontSize: 11, color: 'var(--accent-soft)' }}>{authorHint}</span>}
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
          <datalist id="known-authors">
            {authors.map((a) => <option key={a.id} value={a.name} />)}
          </datalist>

          <label style={labelStyle}>
            العنوان الفرعي
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="اسم الكتاب كاملًا كما سمّاه مؤلِّفه، إن كان يُعرف بغيره"
              style={inputStyle}
            />
          </label>

          {/* قد يجتمع في الكتاب محقِّقان ومخرِّجٌ وثلاثة تقديمات، فلكلٍّ سطرُه */}
          {contribRows.map((row, i) => (
            <div
              key={i}
              className="form-row"
              style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) auto', gap: 10, alignItems: 'end' }}
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
                <input
                  value={row.name}
                  onChange={(e) => patchContrib(i, { name: e.target.value })}
                  style={inputStyle}
                />
              </label>
              {i === contribRows.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setContribRows((prev) => [...prev, { role: CONTRIBUTOR_ROLES[0], name: '' }])}
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

          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              اسم السلسلة
              <input value={series} onChange={(e) => setSeries(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              رقمه في السلسلة
              <input value={seriesNo} onChange={(e) => setSeriesNo(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={labelStyle}>
            التصنيف
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="known-categories"
              placeholder="اختر تصنيفًا أو اكتب تصنيفًا جديدًا"
              style={inputStyle}
            />
            <datalist id="known-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            {category.trim() && !categories.includes(category.trim()) && (
              <span style={{ fontSize: 11, color: 'var(--accent-soft)' }}>تصنيفٌ جديد، سيُضاف إلى تصنيفات المكتبة</span>
            )}
          </label>

          {/* ----------------------------------------------- ٢. بيانات الطبعة */}
          <SectionHeading>٢. بيانات الطبعة</SectionHeading>

          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              دار النَّشْر
              <input
                value={publisherName}
                onChange={(e) => {
                  const name = e.target.value
                  setPublisherName(name)
                  const known = publishers.find((p) => p.name === name.trim())
                  // مكان الدار يتبعها: يُملأ منها، ويُفرَّغ إن غُيِّر اسمُها
                  if (known) setPlace(known.place)
                  else if (knownPublisher) setPlace('')
                }}
                list="known-publishers"
                placeholder="اكتب اسم الدار أو اخترها"
                style={inputStyle}
              />
              <datalist id="known-publishers">
                {publishers.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </label>
            <label style={labelStyle}>
              مكان النَّشْر
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                readOnly={!!knownPublisher}
                title={knownPublisher ? 'مكان الدار يُعدَّل من صفحة دُوْر النَّشْر' : undefined}
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

          {/* حقول صفحات المجلَّدات تُنشأ بعدد المجلَّدات المُدخَل */}
          {manyVolumes && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>عدد صفحات كلّ مُجلَّد</div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px,1fr))',
                gap: 10, marginTop: 12,
              }}>
                {Array.from({ length: volumeCount }, (_, i) => (
                  <label key={i} style={{ ...labelStyle, gap: 5, fontSize: 11.5 }}>
                    المُجلَّد {i + 1}
                    <input
                      value={volumePages[i] ?? ''}
                      onChange={(e) => setVolumePages((prev) => {
                        const next = prev.slice()
                        next[i] = e.target.value
                        return next
                      })}
                      placeholder="صفحات"
                      inputMode="numeric"
                      style={{ ...inputStyle, padding: '7px 10px', borderRadius: 7, fontSize: 13 }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              {manyVolumes ? 'عدد الصفحات إجمالًا' : 'عدد الصفحات'}
              {/* المجموع في المجلَّدات حسابٌ لا إدخال */}
              <input
                value={manyVolumes ? (volumeSum > 0 ? String(volumeSum) : '') : pages}
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
              <select
                value={source}
                onChange={(e) => { setSource(e.target.value); setSourceDetail('') }}
                style={inputStyle}
              >
                {SOURCES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

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
            <HijriYearPicker label="تاريخ الوُرود" value={acquired} onChange={setAcquired} />
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
            <label style={labelStyle}>
              موضوعٌ مُختصَر
              <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} />
            </label>
          </div>

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
                {WORK_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
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

          {newWorks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {newWorks.map((w, i) => (
                <span key={`${w.target_book_id}-${w.type}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'var(--header)',
                  borderRadius: 999, padding: '5px 8px 5px 13px', fontSize: 12.5,
                }}>
                  {w.type} على: {books.find((b) => b.id === w.target_book_id)?.title ?? '—'}
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
            {saving ? '…جارٍ الحفظ' : 'إضافة إلى المكتبة'}
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
