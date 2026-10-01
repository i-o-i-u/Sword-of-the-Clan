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

import { useState, type ReactNode } from 'react'
import { useLibrary } from '../lib/library'
import { linkTo, navigate } from '../lib/router'
import * as api from '../lib/api'
import Prose from './Prose'
import RichText from './RichText'
import { Icon } from '../lib/icons'
import { perkCitation, perkLocation } from '../lib/citation'
import { perkDate, perkLink, sourceAuthor, sourceTitle } from '../lib/perks'
import type { PickField } from '../lib/perks'
import {
  PERK_PREVIEW_CHARS, perkCategoriesOf, perkKindsOf, sourceKindOf, type Perk,
} from '../lib/types'
import {
  CheckIcon, CopyIcon, HashIcon, LinkIcon, OpenBookIcon, PencilIcon,
  ClockIcon, PagesIcon, QuoteIcon,
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
}

/** «قلتُ» في صدر التعليق، بتشكيلها أو بغيره، وما يليها من نقطتين أو فاصلة */
const SAID = /^\s*قلت[ً-ْ]*\s*[:：،,]?\s*/

/**
 * تعليقُ المُقيِّد. صدرُه «قلتُ» في سطرٍ وحده، بخطٍّ غير خطّه وبالحُمرة — كما
 * يميّز النُّسّاخُ كلامَهم من كلام المؤلِّف. وكان صدرُه شارةً تقول «تعليقي»،
 * ثم يبتدئ التعليقُ نفسُه بـ«قلتُ» فتتكرّر العلامةُ مرّتين بلفظين. فالشارةُ
 * سقطت، و«قلتُ» تُنزع من أوّل النصّ إن كُتبت فيه لأنها صارت صدرَه.
 */
export function PerkComment({ text }: { text: string }) {
  const body = text.replace(SAID, '')
  return (
    <aside className="kn-comment">
      <span className="kn-comment-said">قلتُ:</span>
      <Prose text={body} />
    </aside>
  )
}

export default function PerkCard({ perk, hideSource, full, onEdit, onPick }: Props) {
  const {
    perks, bookById, authorById, notebooks, perkKinds, perkCategories, settings,
    canEdit, setError, run, reload,
  } = useLibrary()
  const [open, setOpen] = useState(false)

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const author = book ? authorById(book.author_id) : null
  const title = sourceTitle(perk, book)
  const writer = sourceAuthor(perk, book)
  const place = perkLocation(perk)
  // جنسُ المصدر: كتابٌ من خارج الفهرس، أو سماعٌ، أو صفحةُ شبكة، أو منشور،
  // أو تسجيل. ولكلٍّ ألفاظُ حقوله وشارتُه. وما كان من الفهرس فكتابٌ ساكت.
  const sourceKind = sourceKindOf(perk.source?.kind)
  // موضعُ الفائدة صفحةٌ في الكتاب ودقيقةٌ في التسجيل، فأيقونتُه أيقونتُهما لا
  // دبّوسُ الخريطة: ذاك «موضعٌ» في الأرض، وكان يُقرأ «ص٣٩٨» كأنّه عنوانُ مكان
  const PlaceIcon = sourceKind.isBook ? PagesIcon : ClockIcon

  // والأيقونةُ تُطلب من المُحرَّر ومن المبدئيّ جميعًا: ما لم يُحرَّر بعدُ
  // تُعرض أنواعُه وتصنيفاتُه المبدئيّة، فلو قُرئ من الجدول وحدَه لبقيت
  // بطاقاتُ الفوائد بلا رموزٍ حتى يُفتح لوحُ الإعدادات ويُحفظ
  const iconOfKind = (name: string) =>
    perkKindsOf(perkKinds, perks, settings.perk_kinds_set)
      .find((k) => k.name === name)?.icon ?? ''
  const iconOfCat = (name: string) =>
    perkCategoriesOf(perkCategories, settings.perk_categories_set)
      .find((c) => c.name === name)?.icon ?? ''
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
    <article className={`kn-card${gem ? ' kn-card-gem' : ''}${full ? ' kn-card-full' : ''}`}>
      {/* ------------------------------------------------------ الصدر */}
      <header className="kn-card-head">
        <div className="kn-card-badges">
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
          {full ? perk.title : <a {...linkTo({ name: 'perk', id: perk.id })}>{perk.title}</a>}
        </h3>
      )}

      <div className={folded ? 'kn-card-text kn-folded' : 'kn-card-text'}>
        <RichText html={perk.text_html} text={perk.text} footnotes={perk.footnotes} />
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
      {perk.comment && <PerkComment text={perk.comment} />}

      {/* ------------------------------------------------------- الذيل */}
      <footer className="kn-card-foot">
        {hasCite && (
          <div className="kn-cite">
            <span className="kn-cite-icon" aria-hidden="true">
              <Icon name={book ? 'open-book' : sourceKind.icon} size={15} />
            </span>
            <span className="kn-cite-body">
              <span className="kn-cite-title">
                {book
                  ? <a {...linkTo({ name: 'book', id: book.id })}>{title}</a>
                  : title}
              </span>
              {writer && (
                <span className="kn-cite-author">
                  {writer}
                  {/* والوفاةُ للكتاب وحدَه: من سُمع منه حيٌّ يُرزق */}
                  {sourceKind.isBook && perk.source?.death ? ` (${perk.source.death})` : ''}
                </span>
              )}
              {/* موضعُه وتاريخُه: مجلسُ السماع، أو الموقعُ الذي نُشر فيه، ومتى */}
              {perk.source?.venue && <span className="kn-cite-note">{perk.source.venue}</span>}
              {perk.source?.date && <span className="kn-cite-note">{perk.source.date}</span>}
              {perk.source?.edition && (
                <span className="kn-cite-edition">{perk.source.edition}</span>
              )}
            </span>
            <span className="kn-cite-tail">
              {place && (
                <span className="kn-place">
                  <PlaceIcon size={11} />
                  {place}
                </span>
              )}
              {sourceKind.hasUrl && perk.source?.url && /^https?:\/\//i.test(perk.source.url) && (
                <a
                  className="kn-cite-url"
                  href={perk.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <LinkIcon size={11} />
                  افتح المصدر
                </a>
              )}
              {/* جنسُ المصدر خبرٌ يهمّ القارئ: أيطلبه من الرفّ أم من غيره.
                  ولا يُقال «في المكتبة» — ذاك هو الأصل ههنا. */}
              {!book && (
                <span className="kn-outside">
                  <Icon name={sourceKind.icon} size={11} />
                  {sourceKind.badge}
                </span>
              )}
            </span>
          </div>
        )}

        {/* والموضعُ يُذكر ولو أُخفي المصدر: صفحةُ الكتاب تعرف كتابَها ولا
            تعرف صفحتَه من الفائدة */}
        {hideSource && place && (
          <div className="kn-cite kn-cite-bare">
            <span className="kn-place">
              <PlaceIcon size={11} />
              {place}
            </span>
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
            {!full && (
              <a
                className="kn-tool"
                {...linkTo({ name: 'perk', id: perk.id })}
                title="افتح الفائدة في صفحتها"
                aria-label="افتح الفائدة في صفحتها"
              >
                <OpenBookIcon size={15} />
              </a>
            )}
            <CopyTool
              icon={<CopyIcon size={15} />}
              label="نسخ النصّ"
              value={perk.text}
              onFail={setError}
            />
            <CopyTool
              icon={<QuoteIcon size={15} />}
              label="نسخ العزو"
              value={perkCitation(perk, book, author)}
              onFail={setError}
            />
            <CopyTool
              icon={<LinkIcon size={15} />}
              label="نسخ الرابط"
              value={perkLink(perk.id, perks.map((p) => p.id))}
              onFail={setError}
            />
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
  { icon: ReactNode; label: string; value: string; onFail: (m: string) => void },
) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } catch {
      // بعض المتصفّحات تمنع الحافظة خارج الاتصال الآمن، فيُقال ذلك صراحةً
      onFail('تعذّر النسخ إلى الحافظة، فانسخه بيدك: ' + value)
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
