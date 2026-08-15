// الفوائد والمقتطفات: كلُّ ما استُخرج من كتب المكتبة، تحت عنوان كل كتابٍ
// ما استُخرج منه.
//
// والبحث فيها يشمل عنوان الفائدة ونصَّها وعنوان كتابها ومؤلِّفه، بمعيار
// البحث في المكتبة نفسه — بلا تشكيلٍ ولا تفريقٍ بين الهمزات.
//
// وما حجبه الخادم عن الزائر لا يصل هذه الصفحة أصلًا: فوائدُ الكتاب المخفيّ
// لا تُرسَل، ومفتاحُ «الفوائد والمقتطفات» في تبويب الزوار يُسقطها كلَّها.

import { useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import {
  PERKS_COUNT, QUOTES_COUNT, countLabel, formatNumber, type Perk,
} from '../lib/types'
import {
  BackButton, EmptyState, OpenBookIcon, SearchIcon, cardStyle,
} from '../components/ui'

export default function Perks() {
  const { perks, bookById, settings, isOwner } = useLibrary()
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const canSee = isOwner || settings.visibility.perks

  const groups = useMemo(() => {
    const needle = normalizeText(trimmed, QUICK_OPTS)

    const map = new Map<string, Perk[]>()
    for (const p of perks) {
      const book = bookById(p.book_id)
      if (!book) continue
      if (needle) {
        const hay = normalizeText(
          `${p.title} ${p.text} ${book.title} ${book.author_name}`, QUICK_OPTS,
        )
        if (!hay.includes(needle)) continue
      }
      map.set(p.book_id, [...(map.get(p.book_id) ?? []), p])
    }

    return [...map.entries()]
      .map(([bookId, list]) => ({ book: bookById(bookId)!, perks: list }))
      .sort((a, b) => a.book.title.localeCompare(b.book.title, 'ar'))
  }, [perks, bookById, trimmed])

  const total = groups.reduce((n, g) => n + g.perks.length, 0)

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />

      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        الفوائد والمقتطفات
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--muted)' }}>
        ما استُخرج من كتب المكتبة، تحت عنوان كلِّ كتابٍ ما فيه منها.
      </p>

      {!canSee ? (
        <EmptyState title="الفوائد والمقتطفات غير معروضة" />
      ) : (
        <>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 20,
          }}>
            <span style={{
              position: 'absolute', right: 13, display: 'flex',
              color: 'var(--muted)', pointerEvents: 'none',
            }}>
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الفوائد والمقتطفات: نصًّا، أو عنوانًا، أو اسم كتاب…"
              aria-label="ابحث في الفوائد والمقتطفات"
              style={{
                width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg)',
                fontSize: 14.5, color: 'var(--text)',
              }}
            />
          </div>

          {groups.length === 0 ? (
            <EmptyState
              title={trimmed ? 'لا مطابق' : 'لم تُسجَّل فائدةٌ ولا مقتطف بعد'}
              hint={trimmed
                ? 'جرِّب كلمةً أخرى.'
                : 'تُسجَّل الفائدةُ من صفحة الكتاب الذي استُخرجت منه.'}
            />
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                {formatNumber(total)} في {countLabel(groups.length, PERKS_BOOKS)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {groups.map(({ book, perks: list }) => {
                  const notes = list.filter((p) => p.kind === 'فائدة').length
                  const quotes = list.length - notes
                  return (
                    <section key={book.id} style={{ ...cardStyle, borderRadius: 13, padding: '16px 18px' }}>
                      <div
                        onClick={() => navigate({ name: 'book', id: book.id })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13,
                          paddingBottom: 11, borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', flexWrap: 'wrap',
                        }}
                      >
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 9, flex: 'none',
                          background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                          color: 'var(--accent-soft)',
                        }}>
                          <OpenBookIcon size={16} />
                        </span>
                        <span style={{ fontFamily: 'var(--heading-font)', fontSize: 17, fontWeight: 700 }}>
                          {book.title}
                        </span>
                        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{book.author_name}</span>
                        <span style={{ fontSize: 12, color: 'var(--accent-soft)', marginInlineStart: 'auto' }}>
                          {[
                            notes > 0 && countLabel(notes, PERKS_COUNT),
                            quotes > 0 && countLabel(quotes, QUOTES_COUNT),
                          ].filter(Boolean).join(' و')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {list.map((p) => (
                          <div key={p.id} style={{
                            border: '1px solid var(--border)', borderRadius: 10,
                            padding: '12px 14px', background: 'var(--bg)',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              marginBottom: 6, flexWrap: 'wrap',
                            }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 9px',
                                ...(p.kind === 'فائدة'
                                  ? { color: 'var(--on-accent)', background: 'var(--accent)' }
                                  : {
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--header)',
                                  }),
                              }}>
                                {p.kind}
                              </span>
                              <span style={{
                                fontFamily: 'var(--heading-font)', fontSize: 15.5,
                                fontWeight: 700, flex: 1,
                              }}>
                                {p.title}
                              </span>
                              {p.page && (
                                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>ص {p.page}</span>
                              )}
                            </div>
                            <div className="prose" style={{ fontSize: 14 }}>{p.text}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </main>
  )
}

/** صيغُ عدّ الكتب في هذا السياق: «في كتابين»، «في ٣ كتبٍ» */
const PERKS_BOOKS = {
  none: 'لا كتاب', one: 'كتابٍ واحد', two: 'كتابين', few: 'كتبٍ', many: 'كتابًا',
}
