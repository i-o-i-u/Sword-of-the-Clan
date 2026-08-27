// القرعة: كتابٌ يُنتقى من المكتبة ويُعرض في بطاقةٍ مختصرة.
//
// وكانت تنقل القارئَ إلى صفحة الكتاب رأسًا، وذلك خطأان: أنّ الرجوعَ يردّه
// إلى حيث كان لا إلى قرعةٍ ثانية، فيُعيد الطلبَ من أوّله كلَّما لم يُعجبه
// المقترَح؛ وأنّ الاقتراحَ عرضٌ يُقبَل ويُردّ، ومن ردَّه فقد خرج من صفحته
// وهو لم يُرِد الخروج.
//
// فصارت طبقةً فوق مكانه: يرى فيها ما يكفي للحكم — غلافُه وعنوانُه ومؤلِّفه
// ونبذتُه — ثم يختار: يفتحه، أو يطلب غيره، أو يُغلق فيبقى حيث كان.
//
// والقطعةُ واحدة في الموضعين — الهبوطِ والتصفُّح — كما `SideDoors`، كي لا
// يفترق سلوكُ القرعة بينهما.

import { useCallback, useEffect, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { deathLabel } from '../lib/hijri'
import { contributorLabel, formatNumber, type Book } from '../lib/types'
import { pressesLine } from '../lib/editions'
import ImageSlot from './ImageSlot'
import {
  CloseButton, HourglassIcon, OpenBookIcon, Overlay, PressIcon, Stars, SuggestIcon,
  cardStyle, ghostButtonStyle, primaryButtonStyle,
} from './ui'

/** حدُّ ما يُعرض من النبذة: البطاقةُ عرضٌ يُحكَم به لا موضعُ قراءة */
const BLURB_CHARS = 420

/** كتابٌ بالقرعة، وليس هو الذي قبله ما وجد إلى ذلك سبيلًا */
function drawOther(books: Book[], current: Book | null): Book | null {
  if (books.length === 0) return null
  if (books.length === 1) return books[0]
  const pool = current ? books.filter((b) => b.id !== current.id) : books
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function SuggestedBook({ onClose }: { onClose: () => void }) {
  const { books, authorById, settings } = useLibrary()
  const [book, setBook] = useState<Book | null>(() => drawOther(books, null))

  const again = useCallback(() => setBook((prev) => drawOther(books, prev)), [books])

  // تُغلق بـEsc كسائر الطبقات. والإغلاقُ ههنا مقصودٌ خفيفًا: القرعةُ عرضٌ
  // يُردّ، فلا يُثقَّل ردُّه على القارئ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!book) return null

  const author = authorById(book.author_id)
  const death = deathLabel(author)
  const presses = pressesLine(book)

  // من عمل فيه، مجموعًا بصفته: «المحقِّقان: فلانٌ وفلان»
  const byRole = new Map<string, string[]>()
  for (const c of book.contributors ?? []) {
    const name = c.name.trim()
    if (name) byRole.set(c.role, [...(byRole.get(c.role) ?? []), name])
  }

  const volumes = book.single_volume ? 1 : (book.volumes ?? 0)
  const marks = [
    presses,
    volumes > 1 ? `${formatNumber(volumes)} مجلَّدًا` : '',
    (book.pages ?? 0) > 0 ? `${formatNumber(book.pages)} صفحة` : '',
  ].filter(Boolean)

  return (
    <Overlay onClose={onClose} zIndex={95}>
      <div className="overlay-sheet suggest-sheet" style={{ ...cardStyle, borderRadius: 16 }}>
        <div className="suggest-head">
          <span className="suggest-title">
            <SuggestIcon size={17} />
            كتابٌ من المكتبة بالقُرْعة
          </span>
          <CloseButton onClose={onClose} />
        </div>

        <div className="suggest-body">
          <div className="suggest-cover">
            <ImageSlot url={book.cover_url} folder="covers" canEdit={false} placeholder="غلاف الكتاب" />
          </div>

          <div className="suggest-text">
            {book.category && (
              <span className="suggest-chip">
                {book.sub_category ? `${book.category} ← ${book.sub_category}` : book.category}
              </span>
            )}

            <h2 className="suggest-name">{book.title}</h2>

            <div className="suggest-line">
              <OpenBookIcon size={13} />
              <span>{author?.name?.trim() || book.author_name}</span>
              {death && (
                <span className="suggest-death">
                  <HourglassIcon size={12} />
                  {death}
                </span>
              )}
            </div>

            {[...byRole.entries()].map(([role, names]) => (
              <div key={role} className="suggest-line suggest-line-soft">
                <span>{contributorLabel(role, names.length)}:</span>
                <span>{names.join(' و')}</span>
              </div>
            ))}

            {marks.length > 0 && (
              <div className="suggest-line suggest-line-soft">
                <PressIcon size={13} />
                <span>{marks.join(' — ')}</span>
              </div>
            )}

            {settings.show_ratings && book.rating > 0 && (
              <div className="suggest-line"><Stars rating={book.rating} /></div>
            )}

            {/* النبذةُ تُقصّ إن طالت: البطاقةُ عرضٌ يُحكَم به لا قراءة */}
            {book.blurb && (
              <p className="prose suggest-blurb">
                {book.blurb.length > BLURB_CHARS
                  ? `${book.blurb.slice(0, BLURB_CHARS).trimEnd()}…`
                  : book.blurb}
              </p>
            )}
          </div>
        </div>

        {/* الذيلُ خارج الجوف المُمرَّر، فلا يقع تحت حافّة الشاشة */}
        <div className="suggest-foot">
          <button
            type="button"
            onClick={() => { onClose(); navigate({ name: 'book', id: book.id }) }}
            style={primaryButtonStyle()}
          >
            افتح صفحة الكتاب
          </button>
          <button
            type="button"
            onClick={again}
            disabled={books.length < 2}
            title={books.length < 2 ? 'ليس في المكتبة غيرُه بعد' : 'كتابٌ آخر بالقرعة'}
            style={{ ...ghostButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <SuggestIcon size={15} />
            اقترح لي آخَر
          </button>
        </div>
      </div>
    </Overlay>
  )
}
