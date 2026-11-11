// بطاقة الفائدة، في تصميم الكنّاش الجديد.
//
// وهي قطعةٌ واحدة في المواضع الثلاثة — بابُ «الفوائد»، وصفحةُ الفائدة
// الواحدة، وصفحةُ الكتاب — كي لا يفترق شكلُ الفائدة بين موضعٍ وموضع.
//
// وطبقاتُها ثلاث، يُقرأ بعضُها بعد بعض ولا يُزاحم:
//   ١. **الصدر**: أنواعُها شاراتٍ ملوَّنة، ثم أبوابُها وكرّاساتُها رُقَعًا
//      هادئة، وفي الطرف نفاستُها وتاريخُها.
//   ٢. **المتن**: عنوانُها، ونصُّها — يُطوى إذا طال إلا في صفحتها، ويخفت
//      آخرُ ما ظهر منه فيُعرف أنّ وراءه بقيّة — ثم تعليقُ المُقيِّد مفصولًا.
//   ٣. **الذيل**: عزوُها شريطًا واحدًا، ثم أعلامُها ووسومُها، ثم أدواتُها
//      أيقوناتٍ مضغوطة: تُعرف بالنظر، ولا تأكل من البطاقة سطرًا كاملًا.
//
// **والنفاسة تُعلَّم من صفحة الفائدة وحدها**: هي حكمٌ على المقيَّد بعد النظر
// فيه، فلا تُسأل ساعةَ الكتابة ولا تُبدَّل من صفّ البطاقات مرورًا.
//
// وفي صفحتها أداتان زائدتان: **صورةٌ للمشاركة** (`lib/perkImage.ts`)
// و**الطباعة** (`PerkPrint`).

import { useMemo, useState, type ReactNode } from 'react'
import { useLibrary } from '../lib/library'
import { linkTo, navigate } from '../lib/router'
import * as api from '../lib/api'
import Prose from './Prose'
import RichText from './RichText'
import { Icon } from '../lib/icons'
import { perkCitation } from '../lib/citation'
import { perkDate, perkLink, sourceView, withinOf } from '../lib/perks'
import type { PickField, SourceFact, SourceView } from '../lib/perks'
import { Hl } from '../lib/highlight'
import { highlightPattern } from '../lib/search'
import { PERK_PREVIEW_CHARS, textKindOf, type Perk } from '../lib/types'
import {
  CheckIcon, CopyIcon, DownloadIcon, HashIcon, LinkIcon, OpenBookIcon, PencilIcon,
  PrinterIcon, QuoteIcon,
} from './ui'

interface Props {
  perk: Perk
  /** موضعُها صفحةُ كتابها، فلا يُعاد ذكرُ المصدر الذي هي تحته */
  hideSource?: boolean
  /** صفحةُ الفائدة الواحدة: يُعرض النصُّ تامًّا ولا يُطوى، ولا زرَّ فتحٍ لها */
  full?: boolean
  onEdit?: (perk: Perk) => void
  /** الضغطُ على وسمٍ أو عَلَمٍ يجمع ما تحته. ومن لم يمرّره فهي نصٌّ لا رابط */
  onPick?: (field: PickField, value: string) => void
  /** ما بُحث به، فيُظلَّل حيث وقع من العنوان والنصّ والتعليق */
  highlight?: string
  /** التحديدُ للتعديل الجماعي: أمحدَّدةٌ هي؟ ومن لم يمرّر `onSelect` فلا تحديد */
  selected?: boolean
  onSelect?: (perk: Perk) => void
  /** صفحةُ الفائدة: طباعتُها */
  onPrint?: () => void
}

/** «قلتُ» في صدر التعليق، بتشكيلها أو بغيره، وما يليها من نقطتين أو فاصلة */
const SAID = /^\s*قلت[ً-ْ]*\s*[:：،,]?\s*/

/**
 * تعليقُ المُقيِّد. صدرُه «قلتُ» في سطرٍ وحده، بخطٍّ غير خطّه وبالحُمرة — كما
 * يميّز النُّسّاخُ كلامَهم من كلام المؤلِّف. وكان صدرُه شارةً تقول «تعليقي»،
 * ثم يبتدئ التعليقُ نفسُه بـ«قلتُ» فتتكرّر العلامةُ مرّتين بلفظين. فالشارةُ
 * سقطت، و«قلتُ» تُنزع من أوّل النصّ إن كُتبت فيه لأنها صارت صدرَه.
 */
export function PerkComment({ text, highlight }: { text: string; highlight?: RegExp | null }) {
  const body = text.replace(SAID, '')
  return (
    <aside className="kn-comment">
      <span className="kn-comment-said">قلتُ:</span>
      {/* والتعليقُ يُظلَّل فيه ما بُحث به: يُعرض حينئذٍ فقرةً واحدةً مضبوطة،
          إذ القسمةُ قطعًا لا تجري على فقرات `Prose` */}
      {highlight ? <p className="prose"><Hl text={body} re={highlight} /></p> : <Prose text={body} />}
    </aside>
  )
}

export default function PerkCard(
  { perk, hideSource, full, onEdit, onPick, highlight = '', selected, onSelect, onPrint }: Props,
) {
  const {
    perks, bookById, authorById, notebooks, perkKindList, perkCategoryList,
    canEdit, setError, run, reload,
  } = useLibrary()
  const [open, setOpen] = useState(false)
  const re = useMemo(() => highlightPattern(highlight), [highlight])

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const author = book ? authorById(book.author_id) : null
  // العنوانُ المضموم الذي منه الفائدة: يُعزى إليه، وكتابُه ضامُّه
  const within = withinOf(perk, book)
  // المصدرُ مرتَّبًا للعرض: جنسُه وعنوانُه وموضعُ الفائدة منه وأخبارُه بنعوتها
  // (`sourceView`). والمصدرُ المكتوب لا يُقرأ لفائدةٍ لها كتابٌ من الفهرس
  const view = useMemo(() => sourceView(perk, book, authorById), [perk, book, authorById])
  const title = view.title
  // صفةُ النصّ: المنقولُ بحروفه هو الأصل فلا يُعلَّم، وما سواه شارةٌ في الصدر
  const textKind = textKindOf(perk.text_kind)

  // والأيقونةُ تُطلب من المُحرَّر ومن المبدئيّ جميعًا: ما لم يُحرَّر بعدُ
  // تُعرض أنواعُه وتصنيفاتُه المبدئيّة. والقائمتان محسوبتان في السياق مرّةً
  // (`perkKindList`)، وكانت كلُّ بطاقةٍ تحسبهما لكلّ نوعٍ فيها فتمسح الفوائدَ كلَّها
  const iconOfKind = (name: string) => perkKindList.find((k) => k.name === name)?.icon ?? ''
  const iconOfCat = (name: string) => perkCategoryList.find((c) => c.name === name)?.icon ?? ''
  const inNotebooks = notebooks.filter((n) => perk.notebook_ids.includes(n.id))

  const long = perk.text.length > PERK_PREVIEW_CHARS
  const folded = long && !full && !open
  const gem = perk.rating >= 3

  /** رُقعةٌ تجمع ما تحتها إن مُرِّر `onPick`، وإلّا فنصٌّ ساكت */
  const chip = (field: PickField, value: string, className: string, body: ReactNode = value) =>
    (onPick
      ? (
        <button
          key={`${field}:${value}`}
          type="button"
          className={className}
          onClick={() => onPick(field, value)}
          title="اجمع ما تحته"
        >
          {body}
        </button>
      )
      : <span key={`${field}:${value}`} className={className}>{body}</span>)

  async function setRating(next: number) {
    // النجمةُ المضغوطةُ نفسُها تُرفع بضغطةٍ ثانية، فلا يبقى الحكمُ لازمًا
    const ok = await run(() => api.setPerkRating(perk.id, next === perk.rating ? 0 : next))
    if (ok) await reload()
  }

  const hasMarks = perk.people.length > 0 || perk.tags.length > 0
  const hasCite = !hideSource && !!title

  return (
    <article
      className={`kn-card${gem ? ' kn-card-gem' : ''}${full ? ' kn-card-full' : ''}${selected ? ' kn-card-selected' : ''}`}
      data-perk-id={perk.id}
      tabIndex={-1}
    >
      {/* ------------------------------------------------------ الصدر */}
      <header className="kn-card-head">
        {onSelect && (
          <label className="kn-select" title="حدِّدها للتعديل الجماعي">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onSelect(perk)}
              aria-label={`تحديد الفائدة${perk.title ? ` «${perk.title}»` : ''}`}
            />
          </label>
        )}
        <div className="kn-card-badges">
          {perk.draft && (
            <span className="kn-draft-badge" title="مسوّدةٌ لم تُنشر، لا يراها الزائر">
              <Icon name="draft" size={12} plain />
              مسوّدة
            </span>
          )}
          {textKind.badge && (
            <span className="kn-textkind" title={textKind.hint}>
              <Icon name={textKind.icon} size={12} plain />
              {textKind.badge}
            </span>
          )}
          {perk.kinds.map((kind) => (
            <span key={kind} className={`kn-kind kn-kind-${KIND_TONE[kind] ?? 'plain'}`}>
              {/* والشارةُ المصمتة أرضُها لونُ المكتبة، فلا يُقاتَل لونٌ بلون */}
              <Icon name={iconOfKind(kind)} size={12} plain={KIND_TONE[kind] === 'solid'} />
              {kind}
            </span>
          ))}
          {perk.categories.map((c) => chip(
            'category', c, 'kn-chip',
            <><Icon name={iconOfCat(c)} size={11} />{c}</>,
          ))}
          {perk.sub_categories.map((c) => chip(
            'subCategory', c, 'kn-chip kn-chip-sub',
            <><Icon name={iconOfCat(c)} size={11} />{c}</>,
          ))}
          {inNotebooks.map((n) => chip(
            'notebook', n.id, 'kn-chip kn-chip-notebook',
            <><Icon name={n.icon || 'notebook'} size={11} />{n.name}</>,
          ))}
        </div>

        <div className="kn-card-meta">
          {/* النفاسة نجومٌ بقدرها لا رقمًا: تُقرأ في لمحة. وفي صفحة الفائدة
              تُضغط فتُعلَّم — وهي موضعُ تعليمها لا غير. */}
          {full && canEdit ? (
            <span className="kn-stars kn-stars-edit" role="group" aria-label="نفاستُها">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void setRating(n)}
                  className={n <= perk.rating ? 'on' : ''}
                  title={n === 3 ? 'من النفائس' : `${n} من ٣`}
                  aria-label={`نفاستُها ${n} من ٣`}
                  aria-pressed={n <= perk.rating}
                >
                  ★
                </button>
              ))}
            </span>
          ) : perk.rating > 0 && (
            <span className="kn-stars" title={`نفاستُها ${perk.rating} من ٣`}>
              {'★'.repeat(Math.min(3, perk.rating))}
            </span>
          )}
          <time className="kn-date">{perkDate(perk)}</time>
          {canEdit && onEdit && (
            <button
              type="button"
              className="kn-icon-btn"
              onClick={() => onEdit(perk)}
              title="تعديل الفائدة"
              aria-label="تعديل الفائدة"
            >
              <PencilIcon size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------- المتن */}
      {perk.title && (
        <h3 className="kn-card-title">
          {full || perk.draft
            ? <Hl text={perk.title} re={re} />
            : <a {...linkTo({ name: 'perk', id: perk.id })}><Hl text={perk.title} re={re} /></a>}
        </h3>
      )}

      <div className={folded ? 'kn-card-text kn-folded' : 'kn-card-text'}>
        <RichText
          html={perk.text_html}
          text={perk.text}
          footnotes={perk.footnotes}
          highlight={highlight}
        />
      </div>

      {long && !full && (
        <button
          type="button"
          className="kn-more"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'اطوِ النصّ' : 'اقرأها تامّةً'}
        </button>
      )}

      {/* تعليقُ المُقيِّد مفصولٌ عن النصّ بشارةٍ وشريط: كلامُه لا يُخلَط
          بكلام صاحب الكتاب، وهذا أوَّلُ ما يُتحرَّى في النقل. وتنسيقُه ثابتٌ
          لا يتبع تنسيقَ النصّ، فيُعرف الكلامان بالنظر قبل القراءة. */}
      {perk.comment && <PerkComment text={perk.comment} highlight={re} />}

      {/* ------------------------------------------------------- الذيل */}
      <footer className="kn-card-foot">
        {/* المصدرُ لوحٌ مرتَّب: جنسُه، فعنوانُه، فموضعُ الفائدة منه — الجزءُ
            والصفحة — فأخبارُه بنعوتها. وكان شريطًا تتلاصق فيه الأسماءُ بنقاط،
            فلا يُدرى أمؤلِّفٌ الاسمُ الذي يلي العنوانَ أم محقِّق. */}
        {hasCite && <SourcePanel view={view} />}

        {/* وفي صفحة الكتاب لا يُعاد ذكرُه، ويبقى موضعُ الفائدة منه — وعنوانُها
            المضموم إن كانت منه — فصفحةُ الكتاب تعرف كتابَها ولا تعرف صفحتَه */}
        {hideSource && (view.place.length > 0 || within) && (
          <div className="kn-src kn-src-bare">
            {within && <span className="kn-src-within">من «{within.title}»</span>}
            <Spots place={view.place} />
          </div>
        )}

        <div className="kn-foot-row">
          {hasMarks && (
            <div className="kn-marks">
              {perk.people.map((name) => chip(
                'person', name, 'kn-person',
                <><Icon name="person" size={11} />{name}</>,
              ))}
              {perk.tags.map((tag) => chip(
                'tag', tag, 'kn-tag',
                <><HashIcon size={10} />{tag}</>,
              ))}
            </div>
          )}

          <div className="kn-tools">
            {!full && !perk.draft && (
              <a
                className="kn-tool"
                {...linkTo({ name: 'perk', id: perk.id })}
                title="افتح الفائدة في صفحتها"
                aria-label="افتح الفائدة في صفحتها"
              >
                <OpenBookIcon size={15} />
              </a>
            )}
            {/* وما يُنسخ يُحسب عند الضغط لا مع كل رسم: رابطُ الفائدة المختصر
                يمرّ على الفوائد كلّها ليجد أقصرَ بادئة، وكان يُحسب في كل بطاقة */}
            <CopyTool
              icon={<CopyIcon size={15} />}
              label="نسخ النصّ"
              value={() => perk.text}
              onFail={setError}
            />
            <CopyTool
              icon={<QuoteIcon size={15} />}
              label="نسخ العزو"
              value={() => perkCitation(perk, book, author)}
              onFail={setError}
            />
            {!perk.draft && (
              <CopyTool
                icon={<LinkIcon size={15} />}
                label="نسخ الرابط"
                value={() => perkLink(perk.id, perks.map((p) => p.id))}
                onFail={setError}
              />
            )}
            {full && (
              <ImageTool
                perk={perk}
                cite={() => perkCitation(perk, book, author, false)}
                onFail={setError}
              />
            )}
            {full && onPrint && (
              <button
                type="button"
                className="kn-tool"
                onClick={onPrint}
                title="اطبعها — ومن نافذة الطباعة تُحفظ PDF"
                aria-label="اطبع الفائدة"
              >
                <PrinterIcon size={15} />
              </button>
            )}
            {book && !hideSource && (
              <button
                type="button"
                className="kn-tool kn-tool-wide"
                onClick={() => navigate({ name: 'book', id: book.id })}
                title={`صفحةُ «${book.title}» في الفهرس`}
              >
                <Icon name="shelf" size={15} plain />
                <span>بطاقةُ الكتاب</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </article>
  )
}

/**
 * أداةُ نسخٍ مضغوطة: أيقونةٌ وحدها، يقول اسمَها التلميحُ وقارئُ الشاشة،
 * وتصير علامةَ صحٍّ لحظةً بعد النسخ فيُعلم أنه وقع.
 */
function CopyTool(
  { icon, label, value, onFail }:
  { icon: ReactNode; label: string; value: () => string; onFail: (m: string) => void },
) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value())
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } catch {
      // بعض المتصفّحات تمنع الحافظة خارج الاتصال الآمن، فيُقال ذلك صراحةً.
      // ولا يُلصق المنسوخُ في الرسالة: نصُّ فائدةٍ طويلةٍ يملأ شريطَ الخطأ كلَّه
      onFail('تعذّر النسخ إلى الحافظة: المتصفّحُ منعه. حدِّد النصَّ وانسخه بيدك.')
    }
  }
  return (
    <button
      type="button"
      className={done ? 'kn-tool kn-tool-done' : 'kn-tool'}
      onClick={() => void copy()}
      title={done ? 'نُسخ' : label}
      aria-label={label}
    >
      {done ? <CheckIcon size={15} /> : icon}
    </button>
  )
}

/**
 * صورةُ الفائدة للمشاركة: تُرسم بطاقةً بخطّ المكتبة ولونها، ثم تُشارَك من
 * الجوّال أو تُنزَّل. والرسمُ في ملفٍّ يُجلب عند الضغط، فلا يُحمَّل مع الصفحة.
 */
function ImageTool(
  { perk, cite, onFail }: { perk: Perk; cite: () => string; onFail: (m: string) => void },
) {
  const [busy, setBusy] = useState(false)
  async function make() {
    setBusy(true)
    try {
      const { renderPerkImage, shareOrDownload } = await import('../lib/perkImage')
      const blob = await renderPerkImage({ title: perk.title, text: perk.text, cite: cite() })
      await shareOrDownload(blob, `فائدة-${perk.id.slice(0, 6)}.png`)
    } catch (e) {
      onFail('تعذّر صنعُ صورة الفائدة: ' + ((e as Error)?.message ?? String(e)))
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      className="kn-tool"
      onClick={() => void make()}
      disabled={busy}
      title="صورةٌ للمشاركة — بطاقةٌ بخطّ المكتبة تُرسَل في محادثة"
      aria-label="صورة الفائدة للمشاركة"
    >
      <DownloadIcon size={15} />
    </button>
  )
}

/**
 * لونُ شارة النوع. النقلُ والفائدةُ أكثرُ ما يُقيَّد فلهما اللونُ الممتلئ،
 * والتعقُّبُ لهُ لونُ التنبيه، وما سواهما شارةٌ هادئة — كثرةُ الألوان في
 * الصفحة الواحدة تُذهب دلالتَها. وما استجدّ من أنواع صاحب المكتبة فهادئٌ
 * كذلك، وأيقونتُه هي التي تُميِّزه.
 */
const KIND_TONE: Record<string, string> = {
  'فائدة': 'solid',
  'نقل': 'quote',
  'تعقُّب': 'warn',
}

/** موضعُ الفائدة من مصدرها رقاعًا بنعوتها: «الجزء ١»، «الصفحات ٩٠–٩٢» */
function Spots({ place }: { place: SourceFact[] }) {
  if (place.length === 0) return null
  return (
    <span className="kn-src-spots">
      {place.map((p) => (
        <span key={p.label} className="kn-src-spot">
          <small>{p.label}</small>
          <b>{p.value}</b>
        </span>
      ))}
    </span>
  )
}

/**
 * لوحُ المصدر: جنسُه فوق عنوانه، ثم موضعُ الفائدة منه، ثم أخبارُه في جدولٍ
 * صغيرٍ لكلّ خبرٍ نعتُه — فيُقرأ كما تُقرأ بطاقةُ الفهرس لا سطرًا متلاصقًا.
 */
function SourcePanel({ view }: { view: SourceView }) {
  return (
    <section className="kn-src" aria-label="مصدرُ الفائدة">
      <span className="kn-src-icon" aria-hidden="true">
        <Icon name={view.icon} size={17} />
      </span>
      <div className="kn-src-main">
        <span className="kn-src-kind">{view.kind}</span>
        <div className="kn-src-head">
          <span className="kn-src-title">
            {view.book
              ? <a {...linkTo({ name: 'book', id: view.book.id })}>{view.title}</a>
              : view.title}
          </span>
          <Spots place={view.place} />
        </div>
        {view.facts.length > 0 && (
          <dl className="kn-src-facts">
            {view.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>
                  {f.bookId
                    ? <a {...linkTo({ name: 'book', id: f.bookId })}>{f.value}</a>
                    : f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {view.url && (
          <a className="kn-src-url" href={view.url} target="_blank" rel="noreferrer noopener" dir="auto">
            <LinkIcon size={12} />
            افتح المصدر
          </a>
        )}
      </div>
    </section>
  )
}
