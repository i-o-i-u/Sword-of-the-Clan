// نموذج الفائدة: إدخالًا وتعديلًا جميعًا، كما يخدم `AddBook` الكتابَ في
// الحالين. فسلوكُ كل حقلٍ مكتوبٌ مرّةً واحدة.
//
// وهو نافذةٌ لا صفحة: الفائدةُ تُكتب وأنت في موضعك من «الفوائد» أو من صفحة
// الكتاب، فلا يُخرجك عن مكانك ثم يُعيدك إليه.
//
// وأُعيد بناؤه **لوحَين متجاورَين** على الشاشة الواسعة: الكتابةُ في الأيمن —
// العنوانُ والنصُّ والتعليق، وهي ما يُكتب طويلًا — ووصفُ الفائدة في الأيسر:
// نوعُها وتصنيفُها ومصدرُها وأعلامُها ووسومُها، وهي ما يُختار اختيارًا. وكان
// ذلك كلُّه عمودًا واحدًا يُمرَّر فيه بين النصّ ومصدره ذهابًا وإيابًا.
//
// وفيه ما يحفظ عمل الكاتب، ولم يكن:
//   • **لا يُغلق على إخفاق**: إن لم يُحفظ بقي النموذجُ بما فيه، وكان يُغلق
//     على كل حال فتضيع الفائدةُ بنصّها وهوامشها.
//   • **لا يُغلق بلا سؤال** إن كان فيه ما لم يُحفظ — بالظلّ، أو بـEsc، أو
//     بزرّ الإغلاق.
//   • **مسوّدةٌ تُحفظ في المتصفّح** للفائدة الجديدة وهي تُكتب: فإن انقطع
//     التيّار أو أُغلق اللسانُ خطأً عُرض استردادُها عند الفتح التالي.
//   • **«احفظ وقيِّد أخرى»**: من يقيّد من كتابٍ واحدٍ فوائدَ متتابعة يبقى له
//     المصدرُ والتصنيف، ويُفرَّغ النصُّ وحده. و**Ctrl+Enter** يحفظ.
//
// وما ليس من النموذج باقٍ خارجه كما كان:
//   • **النفاسة** تُعلَّم من صفحة الفائدة بعد قيدها.
//   • **الكرّاسة** تُضاف من صفحة الكرّاسة نفسها.
//
// وقسمُ المصدر شطران: الفائدةُ إمّا من كتابٍ في الفهرس فيكفي اختيارُه، وإمّا
// من غيره فيُكتب عزوُه نصًّا — **وهذا أجناس** (`PERK_SOURCE_KINDS`): كتابٌ
// ليس في الفهرس، وسماعٌ، وصفحةُ شبكة، ومنشورٌ، وتسجيل. **ولكلّ جنسٍ ألفاظُ
// حقوله**، وما لا يُسأل عنه لا يُعرض حقلُه.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { perkTags } from '../lib/perks'
import { Icon } from '../lib/icons'
import {
  htmlIsEmpty, htmlToText, layoutPoemsHtml, orderedFootnotes, sanitizeHtml, textToHtml, type Footnote,
} from '../lib/richtext'
import RichEditor from './RichEditor'
import {
  PERK_SOURCE_KINDS, SOURCE_BOOK, perkCategoriesOf, perkKindsOf, sourceKindOf,
  type Perk,
} from '../lib/types'
import { ClearIcon, CloseButton, Combobox, Overlay, inputStyle } from './ui'

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
  /** جنسُ المصدر حين لا يكون من الفهرس، من `PERK_SOURCE_KINDS` */
  sourceKind: string
  sourceTitle: string
  sourceAuthor: string
  sourceDeath: string
  sourceEdition: string
  sourceUrl: string
  sourceVenue: string
  sourceDate: string
  volume: string
  page: string
  categories: string[]
  subCategories: string[]
  people: string[]
  tags: string[]
}

/** موضعُ مسوّدة الفائدة الجديدة في المتصفّح */
const DRAFT_KEY = 'kn-draft'

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    return d && typeof d.html === 'string' && !htmlIsEmpty(d.html) ? d : null
  } catch { return null }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch { /* تخزينٌ محجوب: لا يضرّ */ }
}

export default function PerkEditor({ perk, bookId, onClose }: Props) {
  const {
    books, bookById, perks, perkKinds, perkCategories, perkFigures, settings,
    canEdit, run, reload,
  } = useLibrary()

  /** الأنواعُ والتصنيفاتُ كما حُرِّرت، وإلّا فالمبدأ */
  const kinds = useMemo(
    () => perkKindsOf(perkKinds, perks, settings.perk_kinds_set),
    [perkKinds, perks, settings.perk_kinds_set],
  )
  const cats = useMemo(
    () => perkCategoriesOf(perkCategories, settings.perk_categories_set),
    [perkCategories, settings.perk_categories_set],
  )

  const startBook = perk?.book_id
    ? bookById(perk.book_id)
    : (bookId ? bookById(bookId) : undefined)

  const initial = useMemo<Draft>(() => ({
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
    sourceKind: perk?.source?.kind || SOURCE_BOOK,
    sourceTitle: perk?.source?.title ?? '',
    sourceAuthor: perk?.source?.author ?? '',
    sourceDeath: perk?.source?.death ?? '',
    sourceEdition: perk?.source?.edition ?? '',
    sourceUrl: perk?.source?.url ?? '',
    sourceVenue: perk?.source?.venue ?? '',
    sourceDate: perk?.source?.date ?? '',
    volume: perk?.volume ?? '',
    page: perk?.page ?? '',
    categories: perk?.categories ?? [],
    subCategories: perk?.sub_categories ?? [],
    people: perk?.people ?? [],
    tags: perk?.tags ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const [d, setD] = useState<Draft>(initial)
  /** ما يُقارَن به لمعرفة ما لم يُحفظ: الأصلُ، أو ما بقي بعد «احفظ وقيِّد أخرى» */
  const [baseline, setBaseline] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  /** مِسماكُ اللوح المنسَّق: يُبدَّل فيُعاد تركيبُه بنصٍّ جديد */
  const [editorKey, setEditorKey] = useState(0)
  /** مسوّدةٌ وُجدت من جلسةٍ سابقة، تُعرض لتُستردّ أو تُطرح */
  const [stash, setStash] = useState<Draft | null>(() => (perk ? null : readDraft()))
  /** عددُ ما قُيِّد في هذه النافذة بـ«احفظ وقيِّد أخرى» */
  const [savedCount, setSavedCount] = useState(0)

  const dirty = JSON.stringify(d) !== JSON.stringify(baseline)

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

  // المسوّدةُ تُحفظ وهي تُكتب — للفائدة الجديدة وحدها: المُعدَّلةُ أصلُها
  // محفوظٌ في القاعدة
  useEffect(() => {
    if (perk || stash || !dirty) return
    const t = setTimeout(() => writeDraft(d), 500)
    return () => clearTimeout(t)
  }, [d, dirty, perk, stash])

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
  /** جنسُ المصدر المختار، وبه تُعرف حقولُه وألفاظُها */
  const sk = useMemo(() => sourceKindOf(d.sourceKind), [d.sourceKind])

  // النصُّ وحده هو اللازم مع مصدره: عنوانُ الفائدة قد لا يخطر لصاحبها ساعةَ
  // يقيّدها. والعنوانُ لا يلزم في كل جنسٍ من المصادر: ما سُمع في مجلسٍ قد لا
  // عنوانَ له وإنما يُعرف بمن سُمع منه — فيكفي أحدُهما
  const hasSource = d.fromLibrary
    ? !!chosen
    : !!(d.sourceTitle.trim() || d.sourceAuthor.trim())
  const ready = !!text.trim() && hasSource
  const missing = !text.trim() ? 'اكتب نصَّ الفائدة' : !hasSource
    ? (d.fromLibrary ? 'اختر كتابها من الفهرس' : `اكتب ${sk.titleLabel} أو ${sk.whoLabel}`)
    : ''

  /** يحفظ. و`again`: يبقى النموذجُ مفتوحًا لفائدةٍ تالية من المصدر نفسه. */
  async function save(again = false) {
    if (!ready || saving) return
    setSaving(true)
    // ويُصفّ الشعرُ قبل الحفظ: الحفظُ بـCtrl+Enter والمؤشِّرُ في البيت الأخير
    // لا يتركه، فلا يصفّه المُحرِّر
    const html = layoutPoemsHtml(sanitizeHtml(d.html))
    const input: api.PerkInput = {
      book_id: d.fromLibrary ? (chosen?.id ?? null) : null,
      kinds: d.kinds,
      title: d.title.trim(),
      text: text.trim(),
      text_html: html,
      // ما مُحي مِسماكُه من النصّ يسقط هامشُه، ولا يبقى في المستند نصٌّ لا
      // موضعَ له. وأمّا الهامشُ الذي لم يُكتب نصُّه بعدُ فيبقى.
      footnotes: orderedFootnotes(html, d.footnotes),
      comment: d.comment.trim(),
      page: d.page.trim(),
      // والمجلَّدُ للكتاب وحدَه: ما سُمع في مجلسٍ لا مجلَّدَ له
      volume: (d.fromLibrary || sk.isBook) ? d.volume.trim() : '',
      categories: d.categories,
      // فرعٌ رُفع رئيسُه بعد اختياره لا يبقى: الفرعُ لا يقوم بغير رئيسه
      sub_categories: d.subCategories.filter(
        (s) => cats.some((c) => c.name === s && d.categories.includes(c.parent)),
      ),
      people: d.people,
      tags: d.tags,
      // وما لا يُسأل عنه في هذا الجنس لا يُحفظ: طبعةٌ لمنشورٍ في التواصل
      // خبرٌ لا معنى له، ولو بقيت من جنسٍ سابقٍ لعُرضت في البطاقة
      source: d.fromLibrary
        ? null
        : {
          kind: sk.name,
          title: d.sourceTitle.trim(),
          author: d.sourceAuthor.trim(),
          death: sk.isBook ? d.sourceDeath.trim() : '',
          edition: sk.isBook ? d.sourceEdition.trim() : '',
          url: sk.hasUrl ? d.sourceUrl.trim() : '',
          venue: sk.whereLabel ? d.sourceVenue.trim() : '',
          date: sk.dateLabel ? d.sourceDate.trim() : '',
        },
    }

    const ok = await run(async () => {
      // العَلَمُ الذي كُتب ولم يكن في السجلّ يُسجَّل، فيُختار من القائمة بعدُ
      for (const name of d.people) {
        if (!figureNames.includes(name)) await api.findOrCreatePerkFigure(name)
      }
      await (perk ? api.updatePerk(perk.id, input) : api.insertPerk(input))
    })
    setSaving(false)
    // **والنافذةُ لا تُغلق على إخفاق**: ما كُتب فيها باقٍ ليُعاد حفظُه
    if (!ok) return

    writeDraft(null)
    await reload()
    if (again) {
      // يبقى المصدرُ والتصنيفُ والنوع، ويُفرَّغ ما يخصّ الفائدةَ وحدها
      const next: Draft = {
        ...d, title: '', html: '', footnotes: [], comment: '', page: '', people: [], tags: [],
      }
      setD(next)
      setBaseline(next)
      setEditorKey((k) => k + 1)
      setSavedCount((n) => n + 1)
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!perk) return
    // الحذفُ لا رجعةَ فيه، فيُستأذَن — كما يُستأذَن في حذف الكتاب من الفهرس
    if (!window.confirm(
      `حذفُ ${perk.title ? `«${perk.title}»` : 'هذه الفائدة'}؟ لا رجعة في هذا.`,
    )) return
    if (await run(() => api.deletePerk(perk.id))) {
      await reload()
      onClose()
    }
  }

  /** طلبُ الإغلاق: يُستأذن فيه إن كان في النموذج ما لم يُحفظ */
  function requestClose() {
    if (dirty && !window.confirm('في النموذج ما لم يُحفظ بعد. أتُغلقه وتُهمله؟')) return
    // من أهمل ما كتب عن قصدٍ لا تُعرض عليه مسوّدتُه بعدُ
    if (!perk && dirty) writeDraft(null)
    onClose()
  }

  function restore() {
    if (!stash) return
    setD(stash)
    setStash(null)
    setEditorKey((k) => k + 1)
  }

  function discardStash() {
    writeDraft(null)
    setStash(null)
  }

  if (!canEdit) return null

  return (
    <Overlay onClose={requestClose} align="flex-start" label={perk ? 'تعديل الفائدة' : 'فائدةٌ جديدة'}>
      <div
        className="kn-editor overlay-sheet"
        onKeyDown={(e) => {
          // Ctrl+Enter يحفظ من أيّ حقل، كما في أكثر محرِّرات الكتابة
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void save()
          }
        }}
      >
        <header className="kn-editor-head">
          <span className="kn-editor-mark" aria-hidden="true">
            <Icon name={perk ? 'draft' : 'quill'} size={20} plain />
          </span>
          <div>
            <h2>{perk ? 'تعديل الفائدة' : 'فائدةٌ جديدة'}</h2>
            {savedCount > 0 && (
              <p className="kn-editor-sub">
                قُيِّد في هذه الجلسة: {savedCount === 1 ? 'فائدةٌ واحدة' : savedCount === 2 ? 'فائدتان' : `${savedCount} فوائد`}
              </p>
            )}
          </div>
          <CloseButton onClose={requestClose} />
        </header>

        {stash && (
          <div className="kn-editor-stash" role="status">
            <span>وُجدت مسوّدةٌ لفائدةٍ لم تُحفظ من قبل.</span>
            <button type="button" className="kn-btn kn-btn-primary kn-btn-sm" onClick={restore}>
              استرجِعْها
            </button>
            <button type="button" className="kn-link-btn" onClick={discardStash}>اطرحها</button>
          </div>
        )}

        <div className="kn-editor-body thin-scroll">
          {/* ------------------------------------------- لوحُ الكتابة */}
          <div className="kn-editor-write">
            <label className="kn-field">
              <span className="kn-field-label">عنوانُها <em>اختياريّ</em></span>
              <input
                value={d.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="عنوانٌ يدلّ عليها — «أوّل من رُويت له ثلاثون بيتًا»"
                style={inputStyle}
                className="kn-title-input"
              />
            </label>

            <div className="kn-field">
              <span className="kn-field-label">نصُّها</span>
              <RichEditor
                key={editorKey}
                html={d.html}
                onChange={(v) => set('html', v)}
                footnotes={d.footnotes}
                onFootnotes={(v) => set('footnotes', v)}
                placeholder="النصُّ كما هو في الكتاب"
              />
            </div>

            {/* تعليقُ المُقيِّد تنسيقُه ثابتٌ مغايرٌ لتنسيق النصّ: كلامُه لا
                يُخلَط بكلام صاحب الكتاب. ولذلك هو حقلٌ مجرَّد لا لوحُ تحرير. */}
            <div className="kn-field">
              <label className="kn-field-label" htmlFor="kn-comment">تعليقي عليها</label>
              <textarea
                id="kn-comment"
                value={d.comment}
                onChange={(e) => set('comment', e.target.value)}
                placeholder="ما تقوله أنت في الفائدة…"
                className="kn-comment-input"
                style={inputStyle}
              />
              {/* و«قلتُ» لا تُكتب: هي صدرُ التعليق في العرض، تُرسم بالحُمرة في
                  سطرٍ وحده (`PerkComment`). وما كُتبت فيه من قبلُ تُنزع منه هناك */}
              <p className="kn-field-hint">
                يُعرض مفصولًا عن النصّ مُصدَّرًا بـ«قلتُ:» — فلا حاجة إلى كتابتها.
              </p>
            </div>
          </div>

          {/* ------------------------------------------- لوحُ الوصف */}
          <div className="kn-editor-describe">
            <Part title="مصدرُها" icon="citation">
              <div className="kn-seg kn-seg-wide" role="group" aria-label="مصدرُها">
                <button
                  type="button"
                  className={d.fromLibrary ? 'on' : ''}
                  onClick={() => set('fromLibrary', true)}
                >
                  <Icon name="shelf" size={14} plain={d.fromLibrary} />
                  من كتب المكتبة
                </button>
                <button
                  type="button"
                  className={!d.fromLibrary ? 'on' : ''}
                  onClick={() => set('fromLibrary', false)}
                >
                  <Icon name="link-ref" size={14} plain={!d.fromLibrary} />
                  من غيرها
                </button>
              </div>

              {d.fromLibrary ? (
                <label className="kn-field">
                  <span className="kn-field-label">الكتاب</span>
                  <Combobox
                    value={d.bookName}
                    onChange={(v) => set('bookName', v)}
                    options={bookTitles}
                    placeholder="اكتب أوّل العنوان…"
                    emptyHint={
                      d.bookName.trim() && !chosen
                        ? 'لا كتابَ بهذا العنوان في الفهرس. فإن كان من خارجها فاختر «من غيرها».'
                        : undefined
                    }
                  />
                  {chosen && (
                    <span className="kn-field-ok">
                      <Icon name="verify" size={12} />
                      {chosen.author_name || 'في الفهرس'}
                    </span>
                  )}
                </label>
              ) : (
                <>
                  {/* جنسُ المصدر: به تُعرف حقولُه وألفاظُها */}
                  <div className="kn-pills" role="group" aria-label="جنسُ المصدر">
                    {PERK_SOURCE_KINDS.map((k) => (
                      <button
                        key={k.name}
                        type="button"
                        onClick={() => set('sourceKind', k.name)}
                        className={d.sourceKind === k.name ? 'kn-pill on' : 'kn-pill'}
                        title={k.hint}
                        aria-pressed={d.sourceKind === k.name}
                      >
                        <Icon name={k.icon} size={13} plain={d.sourceKind === k.name} />
                        {k.name}
                      </button>
                    ))}
                  </div>
                  <p className="kn-field-hint">{sk.hint}.</p>

                  <div className="kn-field-pair">
                    <Field label={sk.titleLabel} value={d.sourceTitle} onChange={(v) => set('sourceTitle', v)} />
                    <Field
                      label={sk.whoLabel}
                      value={d.sourceAuthor}
                      onChange={(v) => set('sourceAuthor', v)}
                      placeholder={sk.isBook ? 'أبو العبَّاس ثعلب' : ''}
                    />
                  </div>

                  {/* والوفاةُ والطبعةُ للكتاب وحدَه: من سُمع منه حيٌّ يُرزق */}
                  {sk.isBook && (
                    <div className="kn-field-pair">
                      <Field
                        label="وفاتُه"
                        value={d.sourceDeath}
                        onChange={(v) => set('sourceDeath', v)}
                        placeholder="ت ٢٩١ هـ — إن عُرفت"
                      />
                      <Field
                        label="طبعتُه"
                        value={d.sourceEdition}
                        onChange={(v) => set('sourceEdition', v)}
                        placeholder="تحقيقُه ودارُه وسنتُه"
                      />
                    </div>
                  )}

                  {(sk.whereLabel || sk.dateLabel) && (
                    <div className="kn-field-pair">
                      {sk.whereLabel && (
                        <Field label={sk.whereLabel} value={d.sourceVenue} onChange={(v) => set('sourceVenue', v)} />
                      )}
                      {sk.dateLabel && (
                        <Field
                          label={sk.dateLabel}
                          value={d.sourceDate}
                          onChange={(v) => set('sourceDate', v)}
                          placeholder="١٥ رجب ١٤٤٧ هـ"
                        />
                      )}
                    </div>
                  )}

                  {sk.hasUrl && (
                    <Field
                      label="رابطُه"
                      value={d.sourceUrl}
                      onChange={(v) => set('sourceUrl', v)}
                      placeholder="https://…"
                      ltr
                    />
                  )}
                </>
              )}

              {/* والموضعُ يتبع جنسَ المصدر: الكتابُ مجلَّدٌ وصفحة، والتسجيلُ
                  دقيقةٌ تُكتب كما هي، وما سواهما لا موضعَ له يُسأل عنه */}
              {(d.fromLibrary || sk.isBook || sk.spotLabel) && (
                <div className="kn-field-pair">
                  {(d.fromLibrary || sk.isBook) && (
                    <Field
                      label="المجلَّد"
                      value={d.volume}
                      onChange={(v) => set('volume', v)}
                      placeholder="٤"
                      numeric
                    />
                  )}
                  <Field
                    label={(d.fromLibrary || sk.isBook) ? 'الصفحة' : sk.spotLabel}
                    value={d.page}
                    onChange={(v) => set('page', v)}
                    placeholder={(d.fromLibrary || sk.isBook) ? '٨٥' : 'د ١٢:٤٠'}
                  />
                </div>
              )}
            </Part>

            <Part title="نوعُها" icon="tag-mark" hint="للفائدة أكثرُ من نوع، فاختر ما اجتمع فيها.">
              <div className="kn-pills">
                {kinds.map((k) => (
                  <button
                    key={k.name}
                    type="button"
                    onClick={() => toggle('kinds', k.name)}
                    className={d.kinds.includes(k.name) ? 'kn-pill on' : 'kn-pill'}
                    title={k.hint || undefined}
                    aria-pressed={d.kinds.includes(k.name)}
                  >
                    {/* المضغوطةُ أرضُها لونُ المكتبة، فتلبس الأيقونةُ لونَه */}
                    <Icon name={k.icon} size={13} plain={d.kinds.includes(k.name)} />
                    {k.name}
                  </button>
                ))}
              </div>
            </Part>

            <Part
              title="تصنيفُها"
              icon="index-list"
              hint="تصنيفاتُ الفوائد قائمةٌ بنفسها لا صلةَ لها بتصنيفات الكتب، وتُحرَّر من إعدادات القسم."
            >
              <div className="kn-pills">
                {mains.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle('categories', c.name)}
                    className={d.categories.includes(c.name) ? 'kn-pill on' : 'kn-pill'}
                    aria-pressed={d.categories.includes(c.name)}
                  >
                    <Icon name={c.icon} size={13} plain={d.categories.includes(c.name)} />
                    {c.name}
                  </button>
                ))}
              </div>
              {subs.length > 0 && (
                <div className="kn-pills kn-pills-sub">
                  {subs.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggle('subCategories', c.name)}
                      className={d.subCategories.includes(c.name) ? 'kn-pill on' : 'kn-pill'}
                      title={`من ${c.parent}`}
                      aria-pressed={d.subCategories.includes(c.name)}
                    >
                      <Icon name={c.icon} size={12} plain={d.subCategories.includes(c.name)} />
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </Part>

            <Part title="أعلامُها ووسومُها" icon="person">
              <TokenField
                label="الأعلام المذكورون فيها"
                hint="يُسجَّل العَلَمُ أوّلَ مرّةٍ يُكتب، ثم يُختار من القائمة"
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
            </Part>
          </div>
        </div>

        {/* الذيلُ خارج الجوف المُمرَّر، فلا يغيب تحت حافّة الشاشة مهما طال
            النموذج. وكان لاصقًا داخله فيقع زرُّ الحفظ تحتها فلا يُبلغ. */}
        <footer className="kn-editor-foot">
          {perk && (
            <button type="button" onClick={() => void remove()} className="kn-btn kn-btn-danger-ghost">
              حذف الفائدة
            </button>
          )}
          <span className="kn-editor-status" aria-live="polite">
            {missing || (dirty ? 'جاهزةٌ للحفظ — Ctrl+Enter' : '')}
          </span>
          <button type="button" onClick={requestClose} className="kn-btn kn-btn-ghost">
            إلغاء
          </button>
          {!perk && (
            <button
              type="button"
              disabled={!ready || saving}
              onClick={() => void save(true)}
              className="kn-btn kn-btn-ghost"
              title="يُحفظ هذه، ويبقى النموذجُ مفتوحًا بالمصدر نفسه لفائدةٍ تالية"
            >
              احفظ وقيِّد أخرى
            </button>
          )}
          <button
            type="button"
            disabled={!ready || saving}
            onClick={() => void save()}
            className="kn-btn kn-btn-primary"
          >
            {saving ? 'تُحفَظ…' : perk ? 'حفظ التعديل' : 'قيِّدها'}
          </button>
        </footer>
      </div>
    </Overlay>
  )
}

/** قسمٌ من لوح الوصف: عنوانُه وأيقونتُه، وتحته حقولُه */
function Part(
  { title, icon, hint, children }: { title: string; icon: string; hint?: string; children: ReactNode },
) {
  return (
    <section className="kn-part">
      <h3>
        <Icon name={icon} size={15} />
        {title}
      </h3>
      {children}
      {hint && <p className="kn-field-hint">{hint}</p>}
    </section>
  )
}

function Field(
  { label, value, onChange, placeholder, ltr, numeric }: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    ltr?: boolean
    numeric?: boolean
  },
) {
  return (
    <label className="kn-field">
      <span className="kn-field-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? 'ltr' : undefined}
        inputMode={ltr ? 'url' : numeric ? 'numeric' : undefined}
        style={inputStyle}
      />
    </label>
  )
}

/**
 * حقلُ قائمةٍ من الكلمات: تُكتب الكلمةُ ويُضغط Enter فتصير رُقعةً، وتُحذف
 * بالضغط عليها. ويُقترح ما سبق ذكرُه، فلا يُكتب العَلَمُ الواحد بوجهين
 * فيفترق ما يجتمع. والفاصلةُ تفصل كما يفصل Enter، فيُلصق سطرُ أسماءٍ دفعةً.
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
  const valuesRef = useRef(values)
  valuesRef.current = values

  function add(raw: string) {
    const fresh = raw.split(/[,،]/).map((v) => v.trim()).filter(Boolean)
      .filter((v, i, all) => !valuesRef.current.includes(v) && all.indexOf(v) === i)
    if (fresh.length) onChange([...valuesRef.current, ...fresh])
    setDraft('')
  }

  return (
    <div className="kn-field">
      <span className="kn-field-label">{label}</span>

      <div className="kn-tokens">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className="kn-token"
            onClick={() => onChange(values.filter((x) => x !== v))}
            title="احذفه"
            aria-label={`احذف ${v}`}
          >
            {v}
            <ClearIcon size={10} />
          </button>
        ))}
        <span
          className="kn-token-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && values.length) {
              onChange(values.slice(0, -1))
            }
          }}
        >
          <Combobox
            value={draft}
            onChange={(v) => {
              // الاختيارُ من القائمة يُضيف رأسًا، والفاصلةُ تُضيف ما قبلها،
              // والكتابةُ تنتظر Enter
              if (options.includes(v)) add(v)
              else if (/[,،]/.test(v)) add(v)
              else setDraft(v)
            }}
            options={options.filter((o) => !values.includes(o))}
            placeholder={placeholder}
          />
        </span>
      </div>
      <p className="kn-field-hint">{hint}</p>
    </div>
  )
}
