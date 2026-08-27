// المتون الدرسية: ما في المكتبة من متونٍ تُقرأ على الشيوخ وتُحفَظ.
//
// وهي بابٌ كالسلاسل: تُشتقّ من الكتب نفسها لا من جدولٍ يُدار — يُعلَّم الكتابُ
// بأنه متنٌ في نموذجه، فيجتمع ههنا مع إخوته.
//
// والقسمةُ بالتصنيف لا بالحروف: المتنُ إنما يُطلب في فنِّه — يُقال متونُ
// الفقه ومتونُ النحو — لا في حرفه من المعجم. وما لم يُصنَّف بعدُ يُؤخَّر في
// بابٍ واحد، فلا يسقط من الصفحة كتابٌ لأن تصنيفه لم يُكتب.

import { useMemo } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { matnBooks } from '../lib/editions'
import { BOOKS_COUNT, MATNS_COUNT, countLabel, type Book } from '../lib/types'
import {
  BackButton, EmptyState, OpenBookIcon, ScrollIcon, cardStyle,
} from '../components/ui'

/** ما لم يُصنَّف بعدُ يُجمع تحت هذا، ويُؤخَّر عن المُصنَّف */
const UNFILED = 'على غير تصنيف'

interface MatnGroup {
  name: string
  books: Book[]
}

export default function Matns() {
  const { books } = useLibrary()

  const groups = useMemo<MatnGroup[]>(() => {
    const map = new Map<string, Book[]>()
    for (const b of matnBooks(books)) {
      const name = b.category.trim() || UNFILED
      map.set(name, [...(map.get(name) ?? []), b])
    }
    return [...map.entries()]
      .map(([name, list]) => ({
        name,
        books: list.slice().sort((a, b) => a.title.localeCompare(b.title, 'ar')),
      }))
      .sort((a, b) => {
        // ما لا تصنيف له آخِرُ الصفحة أبدًا، وما سواه بكثرة متونه
        if (a.name === UNFILED) return 1
        if (b.name === UNFILED) return -1
        return b.books.length - a.books.length || a.name.localeCompare(b.name, 'ar')
      })
  }, [books])

  const total = groups.reduce((n, g) => n + g.books.length, 0)

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />

      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        المُتُون الدَّرْسيَّة
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        ما في المكتبة من متونٍ تُقرأ على الشيوخ وتُحفَظ، مقسومةً بفنونها.
        {total > 0 && ` وهي ${countLabel(total, MATNS_COUNT)}.`}
      </p>

      {groups.length === 0 ? (
        <EmptyState
          title="لا متون بعد"
          hint="يُعلَّم المتنُ في نموذج الكتاب تحت تصنيفه، فيجتمع ههنا مع إخوته."
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
                  <ScrollIcon size={16} />
                </span>
                <span style={{ fontFamily: 'var(--heading-font)', fontSize: 17, fontWeight: 700 }}>
                  {group.name}
                </span>
                <span style={{
                  fontSize: 12, color: 'var(--accent-soft)', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <OpenBookIcon size={13} />
                  {countLabel(group.books.length, BOOKS_COUNT)}
                </span>
              </div>

              <ol className="series-list series-list-filed">
                {group.books.map((book) => (
                  <li key={book.id} onClick={() => navigate({ name: 'book', id: book.id })}>
                    {/* الفرعُ موضعُ الرقم من السلاسل: هو أخصُّ ما يُعرف به
                        المتنُ بعد فنِّه، وشرطةٌ لمن لم يُكتب فرعُه */}
                    <span className="series-no series-no-text">
                      {book.sub_category.trim() || '—'}
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
