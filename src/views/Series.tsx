// السلاسل: ما في المكتبة من كتب كل سلسلة، برقم كلِّ كتابٍ فيها.
//
// والسلاسلُ تُشتقّ من الكتب نفسها لا من جدولٍ يُدار: اسمُ السلسلة يُكتب مع
// الكتاب، كما تُشتقّ دواليبُ صفحة التصفُّح من الكتب.
//
// والترتيب داخل السلسلة برقم الكتاب فيها عدديًّا لا أبجديًّا — «١٠» بعد «٩»
// لا قبله — وما لم يُكتب رقمُه يُؤخَّر إلى آخر السلسلة.

import { useMemo } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { BOOKS_COUNT, countLabel, parseNumber, toLatinDigits, type Book } from '../lib/types'
import {
  BackButton, EmptyState, OpenBookIcon, SeriesIcon, cardStyle,
} from '../components/ui'

interface SeriesGroup {
  name: string
  books: Book[]
}

export default function Series() {
  const { books } = useLibrary()

  const groups = useMemo<SeriesGroup[]>(() => {
    const map = new Map<string, Book[]>()
    for (const b of books) {
      const name = b.series.trim()
      if (!name) continue
      map.set(name, [...(map.get(name) ?? []), b])
    }

    /** رقمُ الكتاب في السلسلة عددًا، وما لا رقم له يُؤخَّر */
    const noOf = (b: Book) => parseNumber(b.series_no) ?? Number.POSITIVE_INFINITY

    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        books: list.slice().sort(
          (a, b) => (noOf(a) - noOf(b)) || a.title.localeCompare(b.title, 'ar'),
        ),
      }))
      .sort((a, b) => b.books.length - a.books.length || a.name.localeCompare(b.name, 'ar'))
  }, [books])

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />

      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        السَّلاسل
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        ما في المكتبة من كتب كلِّ سلسلة، مرتَّبةً برقم كل كتابٍ فيها.
      </p>

      {groups.length === 0 ? (
        <EmptyState
          title="لا سلاسل بعد"
          hint="تُسجَّل السلسلةُ في نموذج الكتاب: اسمُها ورقمُ الكتاب فيها."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((group) => (
            <section key={group.name} style={{ ...cardStyle, borderRadius: 13, padding: '16px 18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13,
                paddingBottom: 11, borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
              }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 9, flex: 'none',
                  background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                  color: 'var(--accent-soft)',
                }}>
                  <SeriesIcon size={16} />
                </span>
                <span style={{ fontFamily: 'var(--heading-font)', fontSize: 17, fontWeight: 700 }}>
                  {group.name}
                </span>
                <span style={{
                  fontSize: 12, color: 'var(--accent-soft)', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <OpenBookIcon size={13} />
                  {countLabel(group.books.length, BOOKS_COUNT)} في المكتبة
                </span>
              </div>

              <ol className="series-list">
                {group.books.map((book) => (
                  <li key={book.id} onClick={() => navigate({ name: 'book', id: book.id })}>
                    {/* رقمُ الكتاب في السلسلة كما كُتب، أو شرطةٌ إن لم يُكتب */}
                    <span className="series-no">
                      {book.series_no.trim() ? toLatinDigits(book.series_no).trim() : '—'}
                    </span>
                    <span className="series-title">{book.title}</span>
                    <span className="series-author">{book.author_name}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
