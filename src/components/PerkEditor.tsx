// نموذج الفائدة: إدخالًا وتعديلًا جميعًا، كما يخدم `AddBook` الكتابَ في
// الحالين. فسلوكُ كل حقلٍ مكتوبٌ مرّةً واحدة.
//
// وهو نافذةٌ لا صفحة: الفائدةُ تُكتب وأنت في موضعك من «الفوائد» أو من صفحة
// الكتاب، فلا يُخرجك عن مكانك ثم يُعيدك إليه.
//
// وأقسامُه ثلاثة لا أكثر: **الفائدة** — أنواعُها وعنوانُها ونصُّها والتعليقُ
// عليها —، ثم **تصنيفُها**، ثم **مصدرُها**. وما سوى ذلك ليس من النموذج:
//   • **النفاسة** تُعلَّم من صفحة الفائدة بعد قيدها — الحكمُ عليها إنما يكون
//     بعد النظر في المقيَّد، فلا يُسأل عنه ساعةَ الكتابة.
//   • **الكرّاسة** تُضاف من صفحة الكرّاسة نفسها — الكرّاسةُ تقوم بعد أن
//     يجتمع لها شيء، فتُجمع إليها الفوائدُ مما قُيِّد لا مما يُقيَّد.
//
// وقسمُ المصدر شطران لا شطرٌ واحد: الفائدةُ إمّا من كتابٍ في الفهرس فيكفي
// اختيارُه — بياناتُه كلُّها مسجَّلة —، وإمّا من كتابٍ ليس فيه فيُكتب عزوُه
// نصًّا. وهذا الشطرُ الثاني هو الذي يُبقي في الكنّاش ما قُرئ في مكتبةٍ عامّة
// أو في نسخةٍ إلكترونيّة أو في كتابٍ مستعار.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { perkTags } from '../lib/perks'
import { Icon } from '../lib/icons'
import {
  htmlToText, orderedFootnotes, sanitizeHtml, textToHtml, type Footnote,
} from '../lib/richtext'
import RichEditor from './RichEditor'
import {
  perkCategoriesOf, perkKindsOf, type Perk,
} from '../lib/types'
import {
  ClearIcon, CloseButton, Combobox, Overlay, chipStyle, ghostButtonStyle,
  inputStyle, primaryButtonStyle,
} from './ui'

interface Props {
  /** الفائدةُ المُعدَّلة، أو فراغٌ إن كانت جديدة */
  perk?: Perk | null
  /** كتابٌ يُبتدأ به: الفائدةُ تُكتب من صفحة كتابها فلا تُسأل عن مصدرها */
  bookId?: string | null
  onClose: () => void
}

/** حالُ النموذج، وهي حقولُ الفائدة كما تُكتب قبل أن تُحفظ */
interface Draft {
  kinds: string[]
  title: string
  html: string
  footnotes: Footnote[]
  comment: string
  fromLibrary: boolean
  bookName: string
  sourceTitle: string
  sourceAuthor: string
  sourceDeath: string
  sourceEdition: string
  volume: string
  page: string
  categories: string[]
  subCategories: string[]
  people: string[]
  tags: string[]
}

export default function PerkEditor({ perk, bookId, onClose }: Props) {
  const {
    books, bookById, perks, perkKinds, perkCategories, perkFigures,
    canEdit, run, reload,
  } = useLibrary()

  /** الأنواعُ والتصنيفاتُ كما حُرِّرت، وإلّا فالمبدأ */
  const kinds = useMemo(() => perkKindsOf(perkKinds, perks), [perkKinds, perks])
  const cats = useMemo(() => perkCategoriesOf(perkCategories), [perkCategories])

  const startBook = perk?.book_id
    ? bookById(perk.book_id)
    : (bookId ? bookById(bookId) : undefined)

  const [d, setD] = useState<Draft>(() => ({
    kinds: perk?.kinds ?? [],
    title: perk?.title ?? '',
    // ما قُيِّد قبل المُحرِّر المنسَّق يُرفع إليه فقراتٍ، فلا يُطالَب صاحبُه
    // بإعادة كتابته
    html: perk ? (perk.text_html || textToHtml(perk.text)) : '',
    footnotes: perk?.footnotes ?? [],
    comment: perk?.comment ?? '',
    // الجديدةُ من الفهرس افتراضًا: أكثرُ ما يُقيَّد إنما يُقيَّد من كتب البيت
    fromLibrary: perk ? perk.book_id !== null : true,
    bookName: startBook?.title ?? '',
    sourceTitle: perk?.source?.title ?? '',
    sourceAuthor: perk?.source?.author ?? '',
    sourceDeath: perk?.source?.death ?? '',
    sourceEdition: perk?.source?.edition ?? '',
    volume: perk?.volume ?? '',
    page: perk?.page ?? '',
    categories: perk?.categories ?? [],
    subCategories: perk?.sub_categories ?? [],
    people: perk?.people ?? [],
    tags: perk?.tags ?? [],
  }))
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  /** يضيف الاسمَ إلى قائمةٍ أو يرفعه منها. والفائدةُ تتبع أكثرَ من واحد. */
  const toggle = (key: 'kinds' | 'categories' | 'subCategories', name: string) =>
    setD((prev) => ({
      ...prev,
      [key]: prev[key].includes(name)
        ? prev[key].filter((x) => x !== name)
        : [...prev[key], name],
    }))

  // ------------------------------------------------------- ما يُختار منه
  const bookTitles = useMemo(() => books.map((b) => b.title), [books])
  const mains = useMemo(() => cats.filter((c) => !c.parent), [cats])
  /** الفروعُ المعروضة فروعُ ما اختِير من الرئيس: فرعٌ بلا رئيسه لا يدلّ */
  const subs = useMemo(
    () => cats.filter((c) => c.parent && d.categories.includes(c.parent)),
    [cats, d.categories],
  )
  const knownTags = useMemo(() => perkTags(perks).map((t) => t.name), [perks])
  const figureNames = useMemo(() => perkFigures.map((f) => f.name), [perkFigures])

  /** الكتابُ المختار من الفهرس، يُطابَق بعنوانه كما يُطابَق في نموذج الكتاب */
  const chosen = useMemo(
    () => books.find((b) => b.title.trim() === d.bookName.trim()),
    [books, d.bookName],
  )

  const text = useMemo(() => htmlToText(d.html), [d.html])

  // النصُّ وحده هو اللازم: عنوانُ الفائدة قد لا يخطر لصاحبها ساعةَ يقيّدها،
  // وليس للنموذج أن يحبس فائدةً عن الكنّاش من أجل عنوان
  const ready = !!text.trim() && (d.fromLibrary ? !!chosen : !!d.sourceTitle.trim())

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    const html = sanitizeHtml(d.html)
    const input: api.PerkInput = {
      book_id: d.fromLibrary ? (chosen?.id ?? null) : null,
      kinds: d.kinds,
      title: d.title.trim(),
      text: text.trim(),
      text_html: html,
      // ما مُحي مِسماكُه من النصّ يسقط هامشُه، ولا يبقى في المستند نصٌّ
      // لا موضعَ له
      footnotes: orderedFootnotes(html, d.footnotes).filter((f) => f.text.trim()),
      comment: d.comment.trim(),
      page: d.page.trim(),
      volume: d.volume.trim(),
      categories: d.categories,
      // فرعٌ رُفع رئيسُه بعد اختياره لا يبقى: الفرعُ لا يقوم بغير رئيسه
      sub_categories: d.subCategories.filter(
        (s) => cats.some((c) => c.name === s && d.categories.includes(c.parent)),
      ),
      people: d.people,
      tags: d.tags,
      source: d.fromLibrary
        ? null
        : {
          title: d.sourceTitle.trim(),
          author: d.sourceAuthor.trim(),
          death: d.sourceDeath.trim(),
          edition: d.sourceEdition.trim(),
        },
    }

    await run(async () => {
      // العَلَمُ الذي كُتب ولم يكن في السجلّ يُسجَّل، فيُختار من القائمة بعدُ
      for (const name of d.people) {
        if (!figureNames.includes(name)) await api.findOrCreatePerkFigure(name)
      }
      await (perk ? api.updatePerk(perk.id, input) : api.insertPerk(input))
    })
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
          <h2>{perk ? 'تعديل الفائدة' : 'فائدةٌ جديدة'}</h2>
          <CloseButton onClose={onClose} />
        </header>

        <div className="perk-editor-body thin-scroll">
          {/* ---------------------------------------------- ١. الفائدة */}
          <span className="perk-part">الفائدة</span>

          <div className="perk-field perk-field-wide">
            <span className="perk-field-label">نوعُها</span>
            <div className="perk-kinds">
              {kinds.map((k) => (
                <button
                  key={k.name}
                  type="button"
                  onClick={() => toggle('kinds', k.name)}
                  style={chipStyle(d.kinds.includes(k.name))}
                  title={k.hint || undefined}
                >
                  {/* المضغوطةُ أرضُها لونُ المكتبة، فتلبس الأيقونةُ لونَه */}
                  <Icon name={k.icon} size={14} plain={d.kinds.includes(k.name)} />
                  {k.name}
                </button>
              ))}
            </div>
            <p className="perk-hint">
              {/* والفائدةُ الواحدة تكون تحريرًا وتعقُّبًا معًا، فلا تُحبَس في نوع */}
              للفائدة أكثرُ من نوع، فاختر ما اجتمع فيها.
              {d.kinds.length === 1 && kinds.find((k) => k.name === d.kinds[0])?.hint
                ? ` و«${d.kinds[0]}»: ${kinds.find((k) => k.name === d.kinds[0])!.hint}.`
                : ''}
            </p>
          </div>

          <label className="perk-field perk-field-wide">
            <span className="perk-field-label">عنوانُها</span>
            <input
              value={d.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="عنوانٌ يدلّ عليها — «أوّل من رُويت له ثلاثون بيتًا»"
              style={inputStyle}
            />
          </label>

          <div className="perk-field perk-field-wide">
            <span className="perk-field-label">نصُّها</span>
            <RichEditor
              html={d.html}
              onChange={(v) => set('html', v)}
              footnotes={d.footnotes}
              onFootnotes={(v) => set('footnotes', v)}
              placeholder="النصُّ كما هو في الكتاب"
            />
          </div>

          {/* تعليقُ المُقيِّد تنسيقُه ثابتٌ مغايرٌ لتنسيق النصّ: كلامُه لا
              يُخلَط بكلام صاحب الكتاب، وهذا أوّلُ ما يُتحرَّى في النقل. ولذلك
              هو حقلٌ مجرَّد لا لوحُ تحرير — لا يُنسَّق فيه شيء. */}
          <div className="perk-field perk-field-wide">
            <label className="perk-field-label" htmlFor="perk-comment">تعليقي عليها</label>
            <textarea
              id="perk-comment"
              value={d.comment}
              onChange={(e) => set('comment', e.target.value)}
              onFocus={() => { if (!d.comment) set('comment', 'قلتُ: ') }}
              placeholder="قلتُ: …"
              className="perk-area perk-area-small perk-comment-input"
              style={inputStyle}
            />
            <p className="perk-hint">
              يُعرض مفصولًا عن النصّ بشارةٍ وشريط، وتنسيقُه ثابتٌ لا يتبع تنسيقَه.
            </p>
          </div>

          {/* ---------------------------------------------- ٢. تصنيفُها */}
          <span className="perk-part">تصنيفُها</span>

          <div className="perk-field perk-field-wide">
            <span className="perk-field-label">في أيّ العلوم هي</span>
            <div className="perk-kinds">
              {mains.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggle('categories', c.name)}
                  style={chipStyle(d.categories.includes(c.name))}
                >
                  <Icon name={c.icon} size={14} plain={d.categories.includes(c.name)} />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="perk-hint">
              تصنيفاتُ الفوائد قائمةٌ بنفسها لا صلةَ لها بتصنيفات الكتب، وتُحرَّر
              من إعدادات القسم.
            </p>
          </div>

          {subs.length > 0 && (
            <div className="perk-field perk-field-wide">
              <span className="perk-field-label">وفروعُه</span>
              <div className="perk-kinds">
                {subs.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle('subCategories', c.name)}
                    style={chipStyle(d.subCategories.includes(c.name))}
                    title={`من ${c.parent}`}
                  >
                    <Icon name={c.icon} size={14} plain={d.subCategories.includes(c.name)} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------------------------------------------- ٣. مصدرُها */}
          <span className="perk-part">مصدرُها</span>

          <div className="perk-field perk-field-wide">
            <div className="perk-kinds">
              <button
                type="button"
                onClick={() => set('fromLibrary', true)}
                style={chipStyle(d.fromLibrary)}
              >
                من كتب المكتبة
              </button>
              <button
                type="button"
                onClick={() => set('fromLibrary', false)}
                style={chipStyle(!d.fromLibrary)}
              >
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
                  placeholder="أبو العبَّاس ثعلب"
                  style={inputStyle}
                />
              </label>
              <label className="perk-field">
                <span className="perk-field-label">وفاتُه</span>
                <input
                  value={d.sourceDeath}
                  onChange={(e) => set('sourceDeath', e.target.value)}
                  placeholder="ت ٢٩١ هـ — إن عُرفت"
                  style={inputStyle}
                />
              </label>
              <label className="perk-field">
                <span className="perk-field-label">طبعتُه</span>
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

          {/* ------------------------------------- ٤. أعلامُها ووسومُها */}
          <span className="perk-part">أعلامُها ووسومُها</span>

          <TokenField
            label="الأعلام المذكورون فيها"
            hint="يُسجَّل العَلَمُ أوّلَ مرّةٍ يُكتب، ثم يُختار من القائمة — فلا يفترق الاسمُ الواحد بوجهين"
            values={d.people}
            options={figureNames}
            onChange={(v) => set('people', v)}
            placeholder="اسمُ العَلَم، ثم Enter"
          />

          <TokenField
            label="وسومُها"
            hint="كلماتٌ يُهتدى بها إليها في البحث وتُعرض عليها"
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
              حذف الفائدة
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
            {saving ? 'تُحفَظ…' : perk ? 'حفظ التعديل' : 'قيِّدها'}
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
