// بطاقة القيد: النوعُ وبابُه ونفاستُه وتاريخُه، ثم عنوانُه ونصُّه وتعليقُ
// المُقيِّد عليه، ثم عزوُه إلى مصدره وموضعُه منه، ثم أعلامُه ووسومُه، ثم
// أدواتُه في الذيل.
//
// وهي قطعةٌ واحدة في المواضع الثلاثة — سيلُ «الفوائد»، وصفحةُ القيد الواحد،
// وصفحةُ الكتاب — كي لا يفترق شكلُ القيد بين موضعٍ وموضع.
//
// والنصُّ يُطوى إذا طال إلا في صفحة القيد وحدها: السيلُ يُتصفَّح لا يُقرأ،
// وقيدٌ واحدٌ يملأ الشاشة يحجب ما بعده.

import { useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
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
  /** صفحةُ القيد الواحد: يُعرض النصُّ تامًّا ولا يُطوى، ولا زرَّ فتحٍ له */
  full?: boolean
  onEdit?: (perk: Perk) => void
  /** الضغطُ على وسمٍ أو عَلَمٍ يجمع ما تحته. ومن لم يمرّره فهي نصٌّ لا رابط */
  onPick?: (field: 'person' | 'tag' | 'category' | 'notebook', value: string) => void
}

export default function PerkCard({ perk, hideSource, full, onEdit, onPick }: Props) {
  const { perks, bookById, authorById, canEdit, setError } = useLibrary()
  const [open, setOpen] = useState(false)

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const author = book ? authorById(book.author_id) : null
  const title = sourceTitle(perk, book)
  const writer = sourceAuthor(perk, book)
  const place = perkLocation(perk)

  const long = perk.text.length > PERK_PREVIEW_CHARS
  const folded = long && !full && !open

  const chip = (
    field: 'person' | 'tag' | 'category' | 'notebook',
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

  return (
    <article className="perk">
      {/* ------------------------------------------------------ الترويسة */}
      <header className="perk-head">
        <span className={`perk-kind perk-kind-${KIND_TONE[perk.kind] ?? 'plain'}`}>
          {perk.kind}
        </span>

        {perk.category && chip('category', perk.category, 'perk-chip')}
        {perk.sub_category && (
          <span className="perk-chip perk-chip-sub">{perk.sub_category}</span>
        )}
        {perk.notebook && chip(
          'notebook', perk.notebook, 'perk-chip perk-chip-book',
          <>
            <OpenBookIcon size={11} />
            {perk.notebook}
          </>,
        )}

        <span className="perk-head-tail">
          {/* النفاسة نجومٌ مملوءة بقدرها لا رقمًا: تُقرأ في لمحة */}
          {perk.rating > 0 && (
            <span className="perk-stars" title={`نفاستُه ${perk.rating} من ٣`}>
              {'★'.repeat(Math.min(3, perk.rating))}
            </span>
          )}
          <span className="perk-date">{perkDate(perk)}</span>
          {canEdit && onEdit && (
            <button
              type="button"
              className="perk-pen"
              onClick={() => onEdit(perk)}
              title="تعديل القيد"
              aria-label="تعديل القيد"
            >
              <PencilIcon size={13} />
            </button>
          )}
        </span>
      </header>

      {/* --------------------------------------------------- المتن */}
      {perk.title && <h3 className="perk-title">{perk.title}</h3>}

      <div className={folded ? 'prose perk-text perk-text-folded' : 'prose perk-text'}>
        {perk.text}
      </div>

      {long && !full && (
        <button type="button" className="perk-more" onClick={() => setOpen((v) => !v)}>
          {open ? 'اطوِ النصّ' : 'اقرأه تامًّا'}
        </button>
      )}

      {/* تعليقُ المُقيِّد مفصولٌ عن النصّ بشارةٍ وشريط: كلامُه لا يُخلَط
          بكلام صاحب الكتاب، وهذا أوَّلُ ما يُتحرَّى في النقل */}
      {perk.comment && (
        <div className="perk-comment">
          <span className="perk-comment-tag">
            <OwnerIcon size={11} />
            تعليقي
          </span>
          <div className="prose">{perk.comment}</div>
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
          {writer && <span className="perk-source-author">{writer}</span>}
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
          صفحتَه من القيد */}
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
            <span>افتح القيد</span>
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
 * الصفحة الواحدة تُذهب دلالتَها.
 */
const KIND_TONE: Record<string, string> = {
  'فائدة': 'solid',
  'نقل': 'quote',
  'تعقُّب': 'warn',
}
