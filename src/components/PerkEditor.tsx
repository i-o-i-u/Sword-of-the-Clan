// نموذج القيد: إدخالًا وتعديلًا جميعًا، كما يخدم `AddBook` الكتابَ في
// الحالين. فسلوكُ كل حقلٍ مكتوبٌ مرّةً واحدة.
//
// وهو نافذةٌ لا صفحة: القيدُ يُكتب وأنت في موضعك من السيل أو من صفحة الكتاب،
// فلا يُخرجك عن مكانك ثم يُعيدك إليه.
//
// وقسمُ المصدر شطران لا شطرٌ واحد: القيدُ إمّا من كتابٍ في الفهرس فيكفي
// اختيارُه — بياناتُه كلُّها مسجَّلة —، وإمّا من كتابٍ ليس فيه فيُكتب عزوُه
// نصًّا. وهذا الشطرُ الثاني هو الذي يُبقي في الكنّاش ما قُرئ في مكتبةٍ عامّة
// أو في نسخةٍ إلكترونيّة أو في كتابٍ مستعار.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { perkNotebooks, perkTags } from '../lib/perks'
import {
  PERK_KINDS, PERK_KIND_HINTS, PERK_RATINGS, type Perk, type PerkKind,
} from '../lib/types'
import {
  ClearIcon, CloseButton, Combobox, Overlay, chipStyle, ghostButtonStyle,
  inputStyle, primaryButtonStyle,
} from './ui'

interface Props {
  /** القيدُ المُعدَّل، أو فراغٌ إن كان جديدًا */
  perk?: Perk | null
  /** كتابٌ يُبتدأ به: القيدُ يُكتب من صفحة كتابه فلا يُسأل عن مصدره */
  bookId?: string | null
  onClose: () => void
}

/** حالُ النموذج، وهي حقولُ القيد كما تُكتب قبل أن تُحفظ */
interface Draft {
  kind: PerkKind
  title: string
  text: string
  comment: string
  fromLibrary: boolean
  bookName: string
  sourceTitle: string
  sourceAuthor: string
  sourceEdition: string
  volume: string
  page: string
  category: string
  subCategory: string
  rating: number
  notebook: string
  people: string[]
  tags: string[]
}

export default function PerkEditor({ perk, bookId, onClose }: Props) {
  const {
    books, bookById, categories, perks, canEdit, run, reload,
  } = useLibrary()

  const startBook = perk?.book_id ? bookById(perk.book_id) : (bookId ? bookById(bookId) : undefined)

  const [d, setD] = useState<Draft>(() => ({
    kind: perk?.kind ?? 'فائدة',
    title: perk?.title ?? '',
    text: perk?.text ?? '',
    comment: perk?.comment ?? '',
    // الجديدُ من الفهرس افتراضًا: أكثرُ ما يُقيَّد إنما يُقيَّد من كتب البيت
    fromLibrary: perk ? perk.book_id !== null : true,
    bookName: startBook?.title ?? '',
    sourceTitle: perk?.source?.title ?? '',
    sourceAuthor: perk?.source?.author ?? '',
    sourceEdition: perk?.source?.edition ?? '',
    volume: perk?.volume ?? '',
    page: perk?.page ?? '',
    category: perk?.category ?? '',
    subCategory: perk?.sub_category ?? '',
    rating: perk?.rating ?? 0,
    notebook: perk?.notebook ?? '',
    people: perk?.people ?? [],
    tags: perk?.tags ?? [],
  }))
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  // ------------------------------------------------------- ما يُختار منه
  const bookTitles = useMemo(() => books.map((b) => b.title), [books])
  const mainCats = useMemo(
    () => categories.filter((c) => !c.parent).map((c) => c.name),
    [categories],
  )
  const subCats = useMemo(
    () => categories.filter((c) => c.parent === d.category).map((c) => c.name),
    [categories, d.category],
  )
  const notebooks = useMemo(() => perkNotebooks(perks).map((t) => t.name), [perks])
  const knownTags = useMemo(() => perkTags(perks).map((t) => t.name), [perks])
  // الأعلامُ يُقترحون ممّن سبق ذكرُه في القيود، وممّن في سجلّ الأشخاص
  const knownPeople = useMemo(() => {
    const seen = new Set<string>()
    for (const p of perks) for (const name of p.people) seen.add(name)
    return [...seen]
  }, [perks])

  /** الكتابُ المختار من الفهرس، يُطابَق بعنوانه كما يُطابَق في نموذج الكتاب */
  const chosen = useMemo(
    () => books.find((b) => b.title.trim() === d.bookName.trim()),
    [books, d.bookName],
  )

  // النصُّ وحده هو اللازم: عنوانُ القيد قد لا يخطر لصاحبه ساعةَ يقيّده،
  // وليس للنموذج أن يحبس فائدةً عن الكنّاش من أجل عنوان
  const ready = !!d.text.trim() && (d.fromLibrary ? !!chosen : !!d.sourceTitle.trim())

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    const input: api.PerkInput = {
      book_id: d.fromLibrary ? (chosen?.id ?? null) : null,
      kind: d.kind,
      title: d.title.trim(),
      text: d.text.trim(),
      comment: d.comment.trim(),
      page: d.page.trim(),
      volume: d.volume.trim(),
      category: d.category.trim(),
      sub_category: d.subCategory.trim(),
      rating: d.rating,
      notebook: d.notebook.trim(),
      people: d.people,
      tags: d.tags,
      source: d.fromLibrary
        ? null
        : {
          title: d.sourceTitle.trim(),
          author: d.sourceAuthor.trim(),
          edition: d.sourceEdition.trim(),
        },
    }
    await run(() => (perk ? api.updatePerk(perk.id, input) : api.insertPerk(input)))
    await reload()
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!perk) return
    await run(() => api.deletePerk(perk.id))
    await reload()
    onClose()
  }

  if (!canEdit) return null

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="perk-editor overlay-sheet">
        <header className="perk-editor-head">
          <h2>{perk ? 'تعديل القيد' : 'قيدٌ جديد'}</h2>
          <CloseButton onClose={onClose} />
        </header>

        <div className="perk-editor-body thin-scroll">
          {/* ------------------------------------------------ ١. القيد */}
          <span className="perk-part">القيد</span>

          <div className="perk-field perk-field-wide">
            <span className="perk-field-label">نوعه</span>
            <div className="perk-kinds">
              {PERK_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  style={chipStyle(d.kind === k)}
                >
                  {k}
                </button>
              ))}
            </div>
            <p className="perk-hint">{PERK_KIND_HINTS[d.kind]}</p>
          </div>

          <label className="perk-field perk-field-wide">
            <span className="perk-field-label">عنوانه</span>
            <input
              value={d.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="عنوانٌ يدلّ عليه — «أوّل من رُويت له ثلاثون بيتًا»"
              style={inputStyle}
            />
          </label>

          <label className="perk-field perk-field-wide">
            <span className="perk-field-label">نصّه</span>
            <textarea
              value={d.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder="النصّ كما هو في الكتاب"
              className="perk-area"
              style={inputStyle}
            />
          </label>

          <label className="perk-field perk-field-wide">
            <span className="perk-field-label">تعليقي عليه</span>
            <textarea
              value={d.comment}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="ما تُعقِّب به عليه — يُعرض مفصولًا عنه فلا يلتبس بكلام صاحبه"
              className="perk-area perk-area-small"
              style={inputStyle}
            />
          </label>

          {/* ------------------------------------------------ ٢. مصدره */}
          <span className="perk-part">مصدره</span>

          <div className="perk-field perk-field-wide">
            <div className="perk-kinds">
              <button type="button" onClick={() => set('fromLibrary', true)} style={chipStyle(d.fromLibrary)}>
                من كتب المكتبة
              </button>
              <button type="button" onClick={() => set('fromLibrary', false)} style={chipStyle(!d.fromLibrary)}>
                من كتابٍ ليس فيها
              </button>
            </div>
          </div>

          {d.fromLibrary ? (
            <label className="perk-field perk-field-wide">
              <span className="perk-field-label">الكتاب</span>
              <Combobox
                value={d.bookName}
                onChange={(v) => set('bookName', v)}
                options={bookTitles}
                placeholder="اكتب أوّل العنوان…"
                emptyHint={
                  d.bookName.trim() && !chosen
                    ? 'لا كتابَ بهذا العنوان في الفهرس. فإن كان من خارجها فاختر «من كتابٍ ليس فيها».'
                    : undefined
                }
              />
            </label>
          ) : (
            <>
              <label className="perk-field">
                <span className="perk-field-label">عنوان الكتاب</span>
                <input
                  value={d.sourceTitle}
                  onChange={(e) => set('sourceTitle', e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label className="perk-field">
                <span className="perk-field-label">مؤلِّفه</span>
                <input
                  value={d.sourceAuthor}
                  onChange={(e) => set('sourceAuthor', e.target.value)}
                  placeholder="باسمه ووفاته — «أبو العبَّاس ثعلب (ت ٢٩١ هـ)»"
                  style={inputStyle}
                />
              </label>
              <label className="perk-field perk-field-wide">
                <span className="perk-field-label">طبعته</span>
                <input
                  value={d.sourceEdition}
                  onChange={(e) => set('sourceEdition', e.target.value)}
                  placeholder="تحقيقُه ودارُه وبلدُه وسنتُه، سطرًا واحدًا كما يُكتب في الحاشية"
                  style={inputStyle}
                />
              </label>
            </>
          )}

          <label className="perk-field">
            <span className="perk-field-label">المجلَّد</span>
            <input
              value={d.volume}
              onChange={(e) => set('volume', e.target.value)}
              placeholder="٤"
              inputMode="numeric"
              style={inputStyle}
            />
          </label>
          <label className="perk-field">
            <span className="perk-field-label">الصفحة</span>
            <input
              value={d.page}
              onChange={(e) => set('page', e.target.value)}
              placeholder="٨٥"
              style={inputStyle}
            />
          </label>

          {/* ------------------------------------- ٣. موضعه من الكنّاش */}
          <span className="perk-part">موضعه من الكنّاش</span>

          <label className="perk-field">
            <span className="perk-field-label">بابه</span>
            <select
              value={d.category}
              onChange={(e) => setD((p) => ({ ...p, category: e.target.value, subCategory: '' }))}
              style={inputStyle}
            >
              <option value="">— بلا باب —</option>
              {mainCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="perk-field">
            <span className="perk-field-label">فرعه</span>
            <select
              value={d.subCategory}
              onChange={(e) => set('subCategory', e.target.value)}
              disabled={subCats.length === 0}
              style={subCats.length === 0
                ? { ...inputStyle, background: 'var(--header)', color: 'var(--muted)' }
                : inputStyle}
            >
              <option value="">{subCats.length === 0 ? 'لا فروع لهذا الباب' : '— بلا فرع —'}</option>
              {subCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <div className="perk-field perk-field-wide">
            <span className="perk-field-label">نفاسته</span>
            <div className="perk-kinds">
              {PERK_RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('rating', r.value)}
                  style={chipStyle(d.rating === r.value)}
                >
                  {r.value > 0 ? `${'★'.repeat(r.value)} ${r.label}` : r.label}
                </button>
              ))}
            </div>
            <p className="perk-hint">وما بلغ النجومَ الثلاث اجتمع في «النفائس».</p>
          </div>

          <label className="perk-field perk-field-wide">
            <span className="perk-field-label">كرّاسته</span>
            <Combobox
              value={d.notebook}
              onChange={(v) => set('notebook', v)}
              options={notebooks}
              placeholder="مسألةٌ يُجمع لها المتفرِّق — «عقِبُ خالد بن الوليد»"
              emptyHint={
                d.notebook.trim() && !notebooks.includes(d.notebook.trim())
                  ? 'كرّاسةٌ جديدة، تقوم بأوّل قيدٍ فيها.'
                  : undefined
              }
            />
          </label>

          <TokenField
            label="الأعلام المذكورون فيه"
            hint="يُجمع بالعَلَم ما تفرَّق عنه من القيود"
            values={d.people}
            options={knownPeople}
            onChange={(v) => set('people', v)}
            placeholder="اسمُ العَلَم، ثم Enter"
          />

          <TokenField
            label="وسومه"
            hint="كلماتٌ يُهتدى بها إليه في البحث وتُعرض عليه"
            values={d.tags}
            options={knownTags}
            onChange={(v) => set('tags', v)}
            placeholder="وسمٌ، ثم Enter"
          />
        </div>

        {/* الذيلُ خارج الجوف المُمرَّر، فلا يغيب تحت حافّة الشاشة مهما طال
            النموذج. وكان لاصقًا داخله فيقع زرُّ الحفظ تحتها فلا يُبلغ. */}
        <footer className="perk-editor-foot">
          {perk && (
            <button type="button" onClick={() => void remove()} className="perk-remove">
              حذف القيد
            </button>
          )}
          <button type="button" onClick={onClose} className="perk-save" style={ghostButtonStyle}>
            إلغاء
          </button>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={() => void save()}
            style={primaryButtonStyle(ready && !saving)}
          >
            {saving ? 'يُحفَظ…' : perk ? 'حفظ التعديل' : 'قيِّده'}
          </button>
        </footer>
      </div>
    </Overlay>
  )
}

/**
 * حقلُ قائمةٍ من الكلمات: تُكتب الكلمةُ ويُضغط Enter فتصير رُقعةً، وتُحذف
 * بالضغط عليها. ويُقترح ما سبق ذكرُه، فلا يُكتب العَلَمُ الواحد بوجهين
 * فيفترق ما يجتمع.
 */
function TokenField(
  { label, hint, values, options, onChange, placeholder }: {
    label: string
    hint: string
    values: string[]
    options: string[]
    onChange: (next: string[]) => void
    placeholder: string
  },
) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const value = raw.trim()
    if (!value || values.includes(value)) { setDraft(''); return }
    onChange([...values, value])
    setDraft('')
  }

  return (
    <div className="perk-field">
      <span className="perk-field-label">{label}</span>

      {values.length > 0 && (
        <div className="perk-tokens">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              className="perk-token"
              onClick={() => onChange(values.filter((x) => x !== v))}
              title="احذفه"
            >
              {v}
              <ClearIcon size={11} />
            </button>
          ))}
        </div>
      )}

      <span
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          add(draft)
        }}
      >
        <Combobox
          value={draft}
          onChange={(v) => {
            // الاختيارُ من القائمة يُضيف رأسًا، والكتابةُ تنتظر Enter
            if (options.includes(v)) add(v)
            else setDraft(v)
          }}
          options={options.filter((o) => !values.includes(o))}
          placeholder={placeholder}
        />
      </span>
      <p className="perk-hint">{hint}</p>
    </div>
  )
}
