// لوحة البحث السريع (§٥-٨): تفتح فوق الصفحة وتبحث في المكتبة كلِّها —
// في الكتب وفي فوائد الكنّاش جميعًا.
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
//  • **قسمان لا قسمٌ واحد**: الكتبُ والفوائد، لكلٍّ صدرُه وعددُه — فالباحث عن
//    فائدةٍ لا يُغرقه ركامُ الكتب، والعكسُ كذلك.
//
// وما حجبه الخادم لا يصل هذه اللوحة أصلًا: الكتبُ والفوائدُ تأتيان مُرشَّحتين.

import { useMemo, useRef, useEffect, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  ALL_SEARCH_KEYS, QUICK_OPTS, bookRank, matchBook, matchWithin,
} from '../lib/search'
import { presetViewState } from '../lib/viewState'
import { withinLabelOf, withinTitlesOf } from '../lib/editions'
import { perkName, searchPerks, sourceTitle } from '../lib/perks'
import { BOOKS_COUNT, PERKS_COUNT, RESULTS_COUNT, countLabel, formatNumber } from '../lib/types'
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
  const { books, perks, bookById, settings, isOwner, perkIndex, wantPerks, perksReady } = useLibrary()
  // ما كُتب في حقل الرأس يصل هنا فتبدأ اللوحة بنتائجه، لا فارغةً
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const trimmed = query.trim()
  const canSeePerks = isOwner || settings.visibility.perks
  // والفوائدُ لا تصل حتى تُطلب: اللوحةُ تبحث فيها، فتطلبها متى فُتحت
  useEffect(() => { if (canSeePerks) wantPerks() }, [canSeePerks, wantPerks])

  // والعنوانُ المضموم يُصاب كما يُصاب صاحبُ السجلّ: هو كتابٌ في المكتبة،
  // فمن بحث عن «الأربعون النووية» وهي في «مهمّات العلم» وجب أن يجدها —
  // وبابُه إليها صفحةُ ضامِّها، إذ لا صفحةَ لها.
  //
  // وترتيبُها برتبة الإصابة (`bookRank`): ما طابق عنوانُه أوّلًا. وكانت على
  // ترتيب الإدخال، فقد يكون الكتابُ المطلوب بعينه خارج الأربعةَ عشرَ المعروضة.
  // ومعه العنوانُ المضموم الذي أُصيب، إن لم يُصَب الكتابُ في نفسه: كانت النتيجةُ
  // تُعرض باسم ضامِّها وحده، فلا يرى الباحثُ عن «الأربعون النووية» ما طلب
  const bookHits = useMemo(
    () => (trimmed
      ? books
        .map((b) => ({
          b,
          own: matchBook(b, trimmed, QUICK_OPTS, ALL_SEARCH_KEYS),
          within: withinTitlesOf(b).find((t) => matchWithin(t, trimmed, QUICK_OPTS)),
        }))
        .filter((x) => x.own || x.within)
        .map((x) => ({ ...x, r: x.own ? bookRank(x.b, trimmed) : 3 }))
        .sort((x, y) => x.r - y.r || x.b.title.localeCompare(y.b.title, 'ar'))
      : []),
    [books, trimmed],
  )

  /** ما زاد على المعروض يُطلب في الفهرس نفسه، ببحثه مكتوبًا في حقله */
  function showAllInBrowse() {
    presetViewState('browse.query', trimmed)
    presetViewState('browse.limit', 60)
    onClose()
    navigate({ name: 'browse' })
  }

  // والفائدةُ تُطابَق بما تُطابَق به في الكنّاش نفسه — نصُّها وهوامشُها
  // ومجلسُ سماعها ومصدرُها — ومن نصوصٍ مُطبَّعةٍ سلفًا (`perkIndex`). وكانت
  // دالّةً ثانيةً تُطبِّع نصَّ كلِّ فائدةٍ مع كل حرفٍ وتغفل عن الهوامش، فيجد
  // القارئُ في الكنّاش ما لا يجده ههنا.
  const perkHits = useMemo(
    () => (trimmed && canSeePerks ? searchPerks(perks, trimmed, bookById, perkIndex) : []),
    [perks, trimmed, canSeePerks, bookById, perkIndex],
  )

  const total = bookHits.length + perkHits.length
  /** والفوائدُ في الطريق: لا يُقال «لا شيء يطابق» قبل أن تصل */
  const perksPending = canSeePerks && !perksReady

  function go(to: () => void) { to(); onClose() }

  // الأسهمُ تنقل بين النتائج، وEnter يفتح المختارة — كما في كلّ لوحة بحث. ومن
  // الحقل يُنزَل بالسهم إلى أوّلها
  const listRef = useRef<HTMLDivElement>(null)
  function onArrows(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('.search-row, .search-all') ?? [])]
    if (!rows.length) return
    e.preventDefault()
    const at = rows.indexOf(document.activeElement as HTMLElement)
    if (at < 0) { if (e.key === 'ArrowDown') rows[0].focus(); return }
    const next = at + (e.key === 'ArrowDown' ? 1 : -1)
    if (next < 0) inputRef.current?.focus()
    else rows[Math.min(next, rows.length - 1)].focus()
  }

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="search-panel overlay-sheet" onKeyDown={onArrows}>
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

        <div className="search-results thin-scroll" ref={listRef}>
          {!trimmed ? (
            <div className="search-blank">
              <SearchIcon size={26} />
              <p>اكتب كلمةً يُبحث بها في الكتب وفي فوائد الكنّاش جميعًا.</p>
            </div>
          ) : total === 0 && perksPending ? (
            <div className="search-blank">
              <p>يُبحث في الفوائد…</p>
            </div>
          ) : total === 0 ? (
            <div className="search-blank">
              <p>لا شيء يطابق «{trimmed}».</p>
              <span>جرِّب كلمةً واحدةً منه، أو اسمَ المؤلِّف.</span>
            </div>
          ) : (
            <>
              <div className="search-total">
                {[
                  countLabel(total, RESULTS_COUNT),
                  bookHits.length > 0 && countLabel(bookHits.length, BOOKS_COUNT),
                  perkHits.length > 0 && countLabel(perkHits.length, PERKS_COUNT),
                ].filter(Boolean).join(' — ')}
              </div>

              {bookHits.length > 0 && (
                <>
                  <Head label="الكتب" count={bookHits.length} shown={MAX_BOOKS} />
                  {bookHits.slice(0, MAX_BOOKS).map(({ b: book, own, within }) => (
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
                        {!own && within ? (
                          <>
                            <span className="search-row-title">{within.title}</span>
                            <span className="search-row-sub">
                              {[within.author_name, `${withinLabelOf(book)} «${book.title}»`]
                                .filter(Boolean).join(' · ')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="search-row-title">{book.title}</span>
                            <span className="search-row-sub">
                              {[book.author_name, book.category].filter(Boolean).join(' · ')}
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                  {bookHits.length > MAX_BOOKS && (
                    <button type="button" className="search-all" onClick={showAllInBrowse}>
                      اعرض الكتبَ كلَّها في الفهرس
                      <span>{formatNumber(bookHits.length)}</span>
                    </button>
                  )}
                </>
              )}

              {perksPending && (
                <div className="search-section"><span>الفوائد في الطريق…</span></div>
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
                            {perkName(perk, 60)}
                          </span>
                          <span className="search-row-sub">
                            {[perk.kinds.join('، '), sourceTitle(perk, book)].filter(Boolean).join(' · ')}
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

