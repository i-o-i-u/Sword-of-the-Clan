// لوحة البحث السريع (§٥-٨): تفتح فوق الصفحة وتبحث في المكتبة كلِّها —
// في الكتب وفي قيود الكنّاش جميعًا.
//
// وهي بابُ الموقع الأسرع، فبُنيت على ما تُبنى عليه أبوابُ البحث:
//
//  • **زرُّ إغلاقٍ ظاهر**، لا الضغطَ في الخارج وحدَه ولا Esc وحدَه: منهما ما
//    لا يعرفه الزائر، ومنهما ما لا يبلغه بإصبعه على الجوّال.
//  • **عددُ ما وُجد** قبل النتائج: القارئُ يعرف أَوَجَدَ كثيرًا فيُضيّق، أم
//    قليلًا فيُوسّع — ولا يعدّها بعينه.
//  • **إرشادُ البحث** تحت الحقل: أنّ التشكيل لا يُشترط، وأنّ الهمزات سواء،
//    وأنّ الكلمات تُطلب مجتمعةً على أيّ ترتيب. وهي خصالٌ في الخوارزمية قائمة
//    من قبل، غير أن أحدًا لم يكن يعلمها فلا يُنتفَع بها.
//  • **قسمان لا قسمٌ واحد**: الكتبُ والقيود، لكلٍّ صدرُه وعددُه — فالباحث عن
//    فائدةٍ لا يُغرقه ركامُ الكتب، والعكسُ كذلك.
//
// وما حجبه الخادم لا يصل هذه اللوحة أصلًا: الكتبُ والقيودُ تأتيان مُرشَّحتين.

import { useMemo, useRef, useEffect, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { QUICK_OPTS, ALL_SEARCH_KEYS, matchBook, matchPerk } from '../lib/search'
import { sourceAuthor, sourceTitle } from '../lib/perks'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import { BOOKS_COUNT, PERKS_COUNT, countLabel, formatNumber } from '../lib/types'
import ImageSlot from './ImageSlot'
import {
  ClearIcon, CloseButton, Overlay, PerkIcon, SearchIcon,
} from './ui'

/** ما يُعرض من كل قسمٍ على الأكثر. وما فوقه يُقال عددُه ولا يُسرَد. */
const MAX_BOOKS = 14
const MAX_PERKS = 12

export default function SearchOverlay(
  { onClose, initialQuery = '' }: { onClose: () => void; initialQuery?: string },
) {
  const { books, perks, bookById, settings, isOwner } = useLibrary()
  // ما كُتب في حقل الرأس يصل هنا فتبدأ اللوحة بنتائجه، لا فارغةً
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useScrollLock()
  useEscapeKey(onClose)
  useEffect(() => { inputRef.current?.focus() }, [])

  const trimmed = query.trim()
  const canSeePerks = isOwner || settings.visibility.perks

  const bookHits = useMemo(
    () => (trimmed ? books.filter((b) => matchBook(b, trimmed, QUICK_OPTS, ALL_SEARCH_KEYS)) : []),
    [books, trimmed],
  )

  const perkHits = useMemo(() => {
    if (!trimmed || !canSeePerks) return []
    return perks.filter((p) => {
      const book = p.book_id ? bookById(p.book_id) : undefined
      const source = `${sourceTitle(p, book)} ${sourceAuthor(p, book)}`
      return matchPerk(p, trimmed, QUICK_OPTS, source)
    })
  }, [perks, trimmed, canSeePerks, bookById])

  const total = bookHits.length + perkHits.length

  function go(to: () => void) { to(); onClose() }

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="search-panel overlay-sheet">
        {/* ------------------------------------------------------ الحقل */}
        <div className="search-head">
          <div className="search-box">
            <SearchIcon size={17} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المكتبة: عنوانًا، أو مؤلِّفًا، أو فائدة…"
              aria-label="ابحث في المكتبة"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="امسح ما كُتب">
                <ClearIcon size={14} />
              </button>
            )}
          </div>
          <CloseButton onClose={onClose} />
        </div>

        {/* إرشادُ البحث: خصالٌ في الخوارزمية قائمةٌ من قبل، وإنما تُقال لتُنتفع */}
        <p className="search-guide">
          <span>لا يلزمك التشكيل</span>
          <span>الهمزاتُ والألفُ سواء</span>
          <span>الكلماتُ تُطلب مجتمعةً على أيّ ترتيب</span>
          <span className="search-guide-key">Esc للإغلاق</span>
        </p>

        <div className="search-results thin-scroll">
          {!trimmed ? (
            <div className="search-blank">
              <SearchIcon size={26} />
              <p>اكتب كلمةً يُبحث بها في الكتب وفي قيود الكنّاش جميعًا.</p>
            </div>
          ) : total === 0 ? (
            <div className="search-blank">
              <p>لا شيء يطابق «{trimmed}».</p>
              <span>جرِّب كلمةً واحدةً منه، أو اسمَ المؤلِّف.</span>
            </div>
          ) : (
            <>
              <div className="search-total">
                {countLabel(total, RESULTS_COUNT)}
                {' في '}
                {[
                  bookHits.length > 0 && countLabel(bookHits.length, BOOKS_COUNT),
                  perkHits.length > 0 && countLabel(perkHits.length, PERKS_COUNT),
                ].filter(Boolean).join(' و')}
              </div>

              {bookHits.length > 0 && (
                <>
                  <Head label="الكتب" count={bookHits.length} shown={MAX_BOOKS} />
                  {bookHits.slice(0, MAX_BOOKS).map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      className="search-row"
                      onClick={() => go(() => navigate({ name: 'book', id: book.id }))}
                    >
                      <span className="search-cover">
                        <ImageSlot
                          url={book.cover_url}
                          folder="covers"
                          onUploaded={() => {}}
                          canEdit={false}
                          placeholder=""
                        />
                      </span>
                      <span className="search-row-body">
                        <span className="search-row-title">{book.title}</span>
                        <span className="search-row-sub">
                          {[book.author_name, book.category].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {perkHits.length > 0 && (
                <>
                  <Head label="الفوائد والمقتطفات" count={perkHits.length} shown={MAX_PERKS} />
                  {perkHits.slice(0, MAX_PERKS).map((perk) => {
                    const book = perk.book_id ? bookById(perk.book_id) : undefined
                    return (
                      <button
                        key={perk.id}
                        type="button"
                        className="search-row"
                        onClick={() => go(() => navigate({ name: 'perk', id: perk.id }))}
                      >
                        <span className="search-mark"><PerkIcon size={16} /></span>
                        <span className="search-row-body">
                          <span className="search-row-title">
                            {perk.title || perk.text.slice(0, 60) + '…'}
                          </span>
                          <span className="search-row-sub">
                            {[perk.kind, sourceTitle(perk, book)].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}

/** صدرُ القسم: اسمُه وعددُه، وما زاد على المعروض يُقال ولا يُسرَد */
function Head({ label, count, shown }: { label: string; count: number; shown: number }) {
  return (
    <div className="search-section">
      <span>{label}</span>
      <span className="search-section-count">
        {count > shown
          ? `${formatNumber(shown)} من ${formatNumber(count)}`
          : formatNumber(count)}
      </span>
    </div>
  )
}

/** صيغُ عدّ النتائج: «نتيجةٌ واحدة»، «نتيجتان»، «٣ نتائجَ»، «١١ نتيجةً» */
const RESULTS_COUNT = {
  none: 'لا نتيجة', one: 'نتيجةٌ واحدة', two: 'نتيجتان',
  few: 'نتائجَ', many: 'نتيجةً',
}
