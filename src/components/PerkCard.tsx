// بطاقة الفائدة: أنواعُها وتصنيفاتُها وكرّاساتُها ونفاستُها وتاريخُها، ثم
// عنوانُها ونصُّها وتعليقُ المُقيِّد عليها، ثم عزوُها إلى مصدرها وموضعُها منه،
// ثم أعلامُها ووسومُها، ثم أدواتُها في الذيل.
//
// وهي قطعةٌ واحدة في المواضع الثلاثة — بابُ «الفوائد»، وصفحةُ الفائدة
// الواحدة، وصفحةُ الكتاب — كي لا يفترق شكلُ الفائدة بين موضعٍ وموضع.
//
// والنصُّ يُطوى إذا طال إلا في صفحة الفائدة وحدها: المجموعُ يُتصفَّح لا يُقرأ،
// وفائدةٌ واحدةٌ تملأ الشاشة تحجب ما بعدها.
//
// **والنفاسة تُعلَّم من صفحة الفائدة وحدها**: هي حكمٌ على المقيَّد بعد النظر
// فيه، فلا تُسأل ساعةَ الكتابة ولا تُبدَّل من صفّ البطاقات مرورًا.

import { useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import * as api from '../lib/api'
import Prose from './Prose'
import RichText from './RichText'
import { Icon } from '../lib/icons'
import { perkCitation, perkLocation } from '../lib/citation'
import { perkDate, perkLink, sourceAuthor, sourceTitle } from '../lib/perks'
import { PERK_PREVIEW_CHARS, type Perk } from '../lib/types'
import {
  CopyButton, HashIcon, LinkIcon, OpenBookIcon, OwnerIcon, PencilIcon,
  PinIcon, QuoteIcon,
} from './ui'

interface Props {
  perk: Perk
  /** موضعُها صفحةُ كتابها، فلا يُعاد ذكرُ المصدر الذي هي تحته */
  hideSource?: boolean
  /** صفحةُ الفائدة الواحدة: يُعرض النصُّ تامًّا ولا يُطوى، ولا زرَّ فتحٍ لها */
  full?: boolean
  onEdit?: (perk: Perk) => void
  /** الضغطُ على وسمٍ أو عَلَمٍ يجمع ما تحته. ومن لم يمرّره فهي نصٌّ لا رابط */
  onPick?: (field: 'person' | 'tag' | 'category' | 'subCategory' | 'notebook', value: string) => void
}

export default function PerkCard({ perk, hideSource, full, onEdit, onPick }: Props) {
  const {
    perks, bookById, authorById, notebooks, perkKinds, perkCategories,
    canEdit, setError, run, reload,
  } = useLibrary()
  const [open, setOpen] = useState(false)

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const author = book ? authorById(book.author_id) : null
  const title = sourceTitle(perk, book)
  const writer = sourceAuthor(perk, book)
  const place = perkLocation(perk)

  const iconOfKind = (name: string) => perkKinds.find((k) => k.name === name)?.icon ?? ''
  const iconOfCat = (name: string) => perkCategories.find((c) => c.name === name)?.icon ?? ''
  const inNotebooks = notebooks.filter((n) => perk.notebook_ids.includes(n.id))

  const long = perk.text.length > PERK_PREVIEW_CHARS
  const folded = long && !full && !open

  const chip = (
    field: 'person' | 'tag' | 'category' | 'subCategory' | 'notebook',
    value: string,
    className: string,
    body: React.ReactNode = value,
  ) => (onPick
    ? (
      <button key={value} type="button" className={className} onClick={() => onPick(field, value)}>
        {body}
      </button>
    )
    : <span key={value} className={className}>{body}</span>
  )

  async function setRating(next: number) {
    // النجمةُ المضغوطةُ نفسُها تُرفع بضغطةٍ ثانية، فلا يبقى الحكمُ لازمًا
    await run(() => api.setPerkRating(perk.id, next === perk.rating ? 0 : next))
    await reload()
  }

  return (
    <article className="perk">
      {/* ------------------------------------------------------ الترويسة */}
      <header className="perk-head">
        {perk.kinds.map((kind) => (
          <span key={kind} className={`perk-kind perk-kind-${KIND_TONE[kind] ?? 'plain'}`}>
            {/* والشارةُ المصمتة أرضُها لونُ المكتبة، فلا يُقاتَل لونٌ بلون */}
            <Icon name={iconOfKind(kind)} size={12} plain={KIND_TONE[kind] === 'solid'} />
            {kind}
          </span>
        ))}

        {perk.categories.map((c) => chip(
          'category', c, 'perk-chip',
          <>
            <Icon name={iconOfCat(c)} size={11} />
            {c}
          </>,
        ))}
        {perk.sub_categories.map((c) => chip(
          'subCategory', c, 'perk-chip perk-chip-sub',
          <>
            <Icon name={iconOfCat(c)} size={11} />
            {c}
          </>,
        ))}
        {inNotebooks.map((n) => chip(
          'notebook', n.id, 'perk-chip perk-chip-book',
          <>
            <Icon name={n.icon || 'notebook'} size={11} />
            {n.name}
          </>,
        ))}

        <span className="perk-head-tail">
          {/* النفاسة نجومٌ مملوءة بقدرها لا رقمًا: تُقرأ في لمحة. وفي صفحة
              الفائدة تُضغط فتُعلَّم — وهي موضعُ تعليمها لا غير. */}
          {full && canEdit ? (
            <span className="perk-stars perk-stars-edit" title="نفاستُها">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void setRating(n)}
                  className={n <= perk.rating ? 'on' : ''}
                  title={n === 3 ? 'من النفائس' : `${n} من ٣`}
                  aria-label={`نفاستُها ${n} من ٣`}
                >
                  ★
                </button>
              ))}
            </span>
          ) : perk.rating > 0 && (
            <span className="perk-stars" title={`نفاستُها ${perk.rating} من ٣`}>
              {'★'.repeat(Math.min(3, perk.rating))}
            </span>
          )}
          <span className="perk-date">{perkDate(perk)}</span>
          {canEdit && onEdit && (
            <button
              type="button"
              className="perk-pen"
              onClick={() => onEdit(perk)}
              title="تعديل الفائدة"
              aria-label="تعديل الفائدة"
            >
              <PencilIcon size={13} />
            </button>
          )}
        </span>
      </header>

      {/* --------------------------------------------------- المتن */}
      {perk.title && <h3 className="perk-title">{perk.title}</h3>}

      <div className={folded ? 'perk-text perk-text-folded' : 'perk-text'}>
        <RichText html={perk.text_html} text={perk.text} footnotes={perk.footnotes} />
      </div>

      {long && !full && (
        <button type="button" className="perk-more" onClick={() => setOpen((v) => !v)}>
          {open ? 'اطوِ النصّ' : 'اقرأها تامّةً'}
        </button>
      )}

      {/* تعليقُ المُقيِّد مفصولٌ عن النصّ بشارةٍ وشريط: كلامُه لا يُخلَط
          بكلام صاحب الكتاب، وهذا أوَّلُ ما يُتحرَّى في النقل. وتنسيقُه ثابتٌ
          لا يتبع تنسيقَ النصّ، فيُعرف الكلامان بالنظر قبل القراءة. */}
      {perk.comment && (
        <div className="perk-comment">
          <span className="perk-comment-tag">
            <OwnerIcon size={11} />
            تعليقي
          </span>
          <Prose text={perk.comment} />
        </div>
      )}

      {/* --------------------------------------------------- العزو */}
      {!hideSource && title && (
        <div className="perk-source">
          <span className="perk-source-title">
            {book
              ? (
                <a
                  className="perk-source-link"
                  href={`#/book/${book.id}`}
                  onClick={(e) => { e.preventDefault(); navigate({ name: 'book', id: book.id }) }}
                >
                  {title}
                </a>
              )
              : title}
          </span>
          {writer && (
            <span className="perk-source-author">
              {writer}
              {perk.source?.death ? ` (${perk.source.death})` : ''}
            </span>
          )}
          {perk.source?.edition && (
            <span className="perk-source-edition">{perk.source.edition}</span>
          )}
          <span className="perk-source-tail">
            {place && (
              <span className="perk-place">
                <PinIcon size={11} />
                {place}
              </span>
            )}
            {/* «ليس في المكتبة» خبرٌ يهمّ القارئ: يعرف أيطلبه من الرفّ أم
                يطلبه من غيره. ولا يُقال «في المكتبة» — ذاك هو الأصل ههنا. */}
            {!book && <span className="perk-outside">ليس في المكتبة</span>}
          </span>
        </div>
      )}

      {/* والموضعُ يُذكر ولو أُخفي المصدر: صفحةُ الكتاب تعرف كتابَها ولا تعرف
          صفحتَه من الفائدة */}
      {hideSource && place && (
        <div className="perk-source">
          <span className="perk-place">
            <PinIcon size={11} />
            {place}
          </span>
        </div>
      )}

      {/* -------------------------------------------- الأعلام والوسوم */}
      {(perk.people.length > 0 || perk.tags.length > 0) && (
        <div className="perk-marks">
          {perk.people.length > 0 && (
            <span className="perk-marks-group">
              <span className="perk-marks-label">الأعلام</span>
              {perk.people.map((name) => chip('person', name, 'perk-person'))}
            </span>
          )}
          {perk.tags.map((tag) => chip(
            'tag', tag, 'perk-tag',
            <>
              <HashIcon size={10} />
              {tag}
            </>,
          ))}
        </div>
      )}

      {/* --------------------------------------------------- الأدوات */}
      <footer className="perk-actions">
        {!full && (
          <button
            type="button"
            className="card-action"
            onClick={() => navigate({ name: 'perk', id: perk.id })}
          >
            <OpenBookIcon size={15} />
            <span>افتح الفائدة</span>
          </button>
        )}
        <CopyButton
          icon={<QuoteIcon size={15} />}
          label="نسخ العزو"
          done="نُسخ العزو"
          value={perkCitation(perk, book, author)}
          onFail={setError}
        />
        <CopyButton
          icon={<LinkIcon size={15} />}
          label="نسخ الرابط"
          done="نُسخ الرابط"
          value={perkLink(perk.id, perks.map((p) => p.id))}
          onFail={setError}
        />
        {book && !hideSource && (
          <button
            type="button"
            className="card-action"
            onClick={() => navigate({ name: 'book', id: book.id })}
            title={`صفحةُ «${book.title}» في الفهرس`}
          >
            <OpenBookIcon size={15} />
            <span>بطاقةُ الكتاب</span>
          </button>
        )}
      </footer>
    </article>
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
