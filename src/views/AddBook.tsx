// إضافة كتاب (§٥-٦): فهرسة كاملة على طريقة المكتبات، في خمسة أقسام.
// الفارق بين «الأجزاء» و«المجلدات المادية» مقصود: الأول تقسيم المؤلِّف،
// والثاني مجلدات هذه الطبعة، وهو وحده ما يُبنى عليه كعوب الرف.

import { useMemo, useState, type FormEvent } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  BINDINGS, CONDITIONS, ERAS, LANGUAGES, SIZES, SOURCES, STATUSES, WORK_TYPES,
  parseNumber, type Era, type ReadingStatus,
} from '../lib/types'
import HijriDatePicker from '../components/HijriDatePicker'
import ImageSlot from '../components/ImageSlot'
import {
  RiyalGlyph, SectionHeading, Toggle, cardStyle, outlineTabStyle, primaryButtonStyle,
} from '../components/ui'

const inputStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, width: '100%',
} as const

const labelStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, color: 'var(--muted)',
}

const row2 = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 } as const
const row3 = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 } as const
const row21 = { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 14 } as const

export default function AddBook() {
  const { authors, books, shelves, categories, settings, run, reload } = useLibrary()

  const [title, setTitle] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [verifier, setVerifier] = useState('')
  const [translator, setTranslator] = useState('')
  const [presenter, setPresenter] = useState('')
  const [series, setSeries] = useState('')
  const [seriesNo, setSeriesNo] = useState('')
  const [category, setCategory] = useState(categories[0] ?? '')
  const [room, setRoom] = useState(shelves[0] ?? '')

  const [publisher, setPublisher] = useState('')
  const [place, setPlace] = useState('')
  const [year, setYear] = useState('')
  const [yearEra, setYearEra] = useState<Era>('هـ')
  const [edition, setEdition] = useState('')
  const [parts, setParts] = useState('')
  const [volumes, setVolumes] = useState('')
  const [size, setSize] = useState(SIZES[1])
  const [splitVolumePages, setSplitVolumePages] = useState(false)
  const [volumePages, setVolumePages] = useState<string[]>([])
  const [pages, setPages] = useState('')
  const [isbn, setIsbn] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0])

  const [shelfNo, setShelfNo] = useState('')
  const [binding, setBinding] = useState(BINDINGS[0])
  const [condition, setCondition] = useState(CONDITIONS[1])
  const [source, setSource] = useState(SOURCES[0])
  const [value, setValue] = useState('')
  const [acqDay, setAcqDay] = useState<number | null>(null)
  const [acqMonth, setAcqMonth] = useState<number | null>(null)
  const [acqYear, setAcqYear] = useState<number | null>(null)

  const [workTargetId, setWorkTargetId] = useState('')
  const [workType, setWorkType] = useState(WORK_TYPES[0])
  const [newWorks, setNewWorks] = useState<{ target_book_id: string; type: string }[]>([])

  const [status, setStatus] = useState<ReadingStatus>('لم تُقرأ')
  const [tags, setTags] = useState('')
  const [topic, setTopic] = useState('')
  const [blurb, setBlurb] = useState('')
  const [notes, setNotes] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const volumeCount = Math.min(20, Math.max(1, parseNumber(volumes) ?? 1))
  const volumeSum = volumePages.slice(0, volumeCount).reduce((sum, v) => sum + (parseNumber(v) ?? 0), 0)

  const authorHint = useMemo(() => {
    const trimmed = authorName.trim()
    if (!trimmed) return ''
    return authors.some((a) => a.name === trimmed)
      ? 'سيُضاف الكتاب إلى صفحة هذا المؤلِّف'
      : 'مؤلِّفٌ جديد، ستُنشأ له صفحة خاصة'
  }, [authorName, authors])

  const ready = !!(title.trim() && authorName.trim())

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    try {
      const author = await api.findOrCreateAuthor(authorName)
      const volPages = splitVolumePages
        ? volumePages.slice(0, volumeCount).map((v) => parseNumber(v)).filter((n): n is number => n != null)
        : []

      const book = await api.insertBook({
        title: title.trim(),
        subtitle: subtitle.trim(),
        author_id: author.id,
        author_name: author.name,
        verifier: verifier.trim(),
        translator: translator.trim(),
        presenter: presenter.trim(),
        series: series.trim(),
        series_no: seriesNo.trim(),
        category,
        room,
        publisher: publisher.trim(),
        place: place.trim(),
        year: parseNumber(year),
        year_era: yearEra,
        edition: edition.trim(),
        parts: parseNumber(parts),
        volumes: parseNumber(volumes),
        volume_pages: volPages,
        // إن فُرِّقت صفحات المجلدات ولم يُكتب مجموع، أُخذ المجموع منها
        pages: parseNumber(pages) ?? (volumeSum > 0 ? volumeSum : null),
        size,
        isbn: isbn.trim(),
        language,
        shelf_no: shelfNo.trim(),
        binding,
        condition,
        source,
        acquired_day: acqDay,
        acquired_month: acqMonth,
        acquired_year: acqYear,
        value: parseNumber(value) ?? 0,
        topic: topic.trim(),
        tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        blurb: blurb.trim(),
        notes: notes.trim(),
        status,
        cover_url: coverUrl,
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
        إضافة كتاب جديد
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        فهرسة كاملة على طريقة المكتبات: بيانات الكتاب، والنشر، والنسخة وموضعها على الرف، وصلته بغيره من الكتب.
      </p>

      <form
        onSubmit={handleSubmit}
        className="add-grid"
        style={{
          ...cardStyle, display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)',
          gap: 28, borderRadius: 14, padding: 26,
        }}
      >
        <div className="add-cover" style={{ width: '100%', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden' }}>
          <ImageSlot
            url={coverUrl}
            folder="covers"
            canEdit
            placeholder="غلاف الكتاب (اختياري)"
            onUploaded={(url) => setCoverUrl(url)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ------------------------------------------------ ١. بيانات الكتاب */}
          <SectionHeading>١. بيانات الكتاب</SectionHeading>
          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              العنوان
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              المؤلف
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                list="known-authors"
                placeholder="اكتب اسمًا جديدًا أو اختر من مؤلِّفي المكتبة"
                style={inputStyle}
              />
              <datalist id="known-authors">
                {authors.map((a) => <option key={a.id} value={a.name} />)}
              </datalist>
              <span style={{ fontSize: 11, color: 'var(--accent-soft)' }}>{authorHint}</span>
            </label>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              العنوان الفرعي
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              المحقق
              <input value={verifier} onChange={(e) => setVerifier(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              المترجم
              <input value={translator} onChange={(e) => setTranslator(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              المُقدِّم / المُراجع
              <input value={presenter} onChange={(e) => setPresenter(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              السلسلة
              <input value={series} onChange={(e) => setSeries(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              رقمه في السلسلة
              <input value={seriesNo} onChange={(e) => setSeriesNo(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              التصنيف
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              الرف داخل المكتبة
              <select value={room} onChange={(e) => setRoom(e.target.value)} style={inputStyle}>
                {shelves.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>

          {/* ------------------------------------------------ ٢. بيانات النشر */}
          <SectionHeading>٢. بيانات النشر</SectionHeading>
          <div className="form-row" style={row21}>
            <label style={labelStyle}>
              الناشر
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              مكان النشر
              <input value={place} onChange={(e) => setPlace(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              سنة النشر
              <span style={{ display: 'flex', gap: 8 }}>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  inputMode="numeric"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={yearEra}
                  onChange={(e) => setYearEra(e.target.value as Era)}
                  aria-label="تقويم سنة النشر"
                  style={{ ...inputStyle, width: 88, padding: '9px 8px', fontSize: 13 }}
                >
                  {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </span>
            </label>
            <label style={labelStyle}>
              رقم الطبعة
              <input value={edition} onChange={(e) => setEdition(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              عدد الأجزاء (تقسيم المؤلِّف)
              <input value={parts} onChange={(e) => setParts(e.target.value)} placeholder="مثال: ١٠" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              عدد المجلدات المادية (الطبعة)
              <input value={volumes} onChange={(e) => setVolumes(e.target.value)} placeholder="مثال: ٥" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              حجم الكتاب
              <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
                {SIZES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>تفريق صفحات المجلدات</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  إدخال صفحات كل مجلد على حِدَة بدلًا من رقم واحد للكتاب
                </div>
              </div>
              <Toggle on={splitVolumePages} onChange={() => setSplitVolumePages((v) => !v)} label="تفريق صفحات المجلدات" />
            </div>

            {splitVolumePages && (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px,1fr))',
                  gap: 10, marginTop: 12,
                }}>
                  {Array.from({ length: volumeCount }, (_, i) => (
                    <label key={i} style={{ ...labelStyle, gap: 5, fontSize: 11.5 }}>
                      المجلد {i + 1}
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
                {volumeSum > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent-soft)', marginTop: 10, fontWeight: 600 }}>
                    مجموع صفحات المجلدات: {volumeSum} صفحة
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              عدد الصفحات (إجمالًا)
              <input value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" style={inputStyle} />
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

          {/* --------------------------------------------- ٣. النسخة وموضعها */}
          <SectionHeading>٣. النسخة وموضعها</SectionHeading>
          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              رقم الرف / الموضع
              <input value={shelfNo} onChange={(e) => setShelfNo(e.target.value)} placeholder="مثال: رف ٣ – صف أعلى" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              نوع التغليف
              <select value={binding} onChange={(e) => setBinding(e.target.value)} style={inputStyle}>
                {BINDINGS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              الحالة المادية
              <select value={condition} onChange={(e) => setCondition(e.target.value)} style={inputStyle}>
                {CONDITIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row" style={row3}>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>قيمة الكتاب</span>
                {settings.currency === 'ريال' ? <RiyalGlyph /> : <span>({settings.currency})</span>}
              </span>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              مصدر الاقتناء
              <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
                {SOURCES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <HijriDatePicker
              day={acqDay}
              month={acqMonth}
              year={acqYear}
              onChange={(d, m, y) => { setAcqDay(d); setAcqMonth(m); setAcqYear(y) }}
            />
          </div>

          {/* ------------------------------------ ٤. أعمالٌ على كتب أخرى */}
          <SectionHeading>٤. أعمالٌ على كتب أخرى</SectionHeading>
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

          {/* ------------------------------------ ٥. القراءة والملاحظات */}
          <SectionHeading>٥. القراءة والملاحظات</SectionHeading>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>حالة القراءة</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} style={outlineTabStyle(status === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row" style={row2}>
            <label style={labelStyle}>
              وسوم (مفصولة بفاصلة)
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="مثال: تراث، مرجع، مُهدى" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              موضوع مختصر
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
            ملاحظات (اختياري)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, lineHeight: 1.9, resize: 'vertical' }}
            />
          </label>

          <button type="submit" disabled={!ready || saving} style={{ ...primaryButtonStyle(ready && !saving), marginTop: 6 }}>
            {saving ? '…جارٍ الحفظ' : 'إضافة إلى المكتبة'}
          </button>
        </div>
      </form>
    </main>
  )
}
