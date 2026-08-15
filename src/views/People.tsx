// المُحقِّقون ونحوهم: من عمل في كتب المكتبة بغير التأليف.
//
// وهم في سجلّ الأشخاص نفسه الذي فيه المؤلِّفون — جدولُ `authors` — فالرجلُ
// الواحد قد يُحقِّق ويؤلِّف، فيُعدّ هنا وهناك جميعًا، وصفحتُه واحدة تُجمع
// فيها مؤلَّفاتُه وتحقيقاتُه. ومن لم يكن له تأليفٌ مسجَّل لم يُعرض في صفحة
// المؤلِّفين، وعُرض هنا وحدها.
//
// وترتيبُ الصفات هو ترتيبُها في `CONTRIBUTOR_ROLES`، ولا يُعرض منها إلا ما
// له أصحاب: قائمةٌ فارغة ليست خبرًا.

import { useMemo } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { deathLabel } from '../lib/hijri'
import { peopleByRole } from '../lib/people'
import { BOOKS_COUNT, countLabel, formatNumber, roleGroupLabel } from '../lib/types'
import {
  BackButton, EmptyState, HourglassIcon, OpenBookIcon, VerifyIcon, cardStyle,
} from '../components/ui'

export default function People() {
  const { books, authors } = useLibrary()

  const groups = useMemo(() => {
    const byId = new Map(authors.map((a) => [a.id, a]))
    // عددُ ما عمل فيه الرجلُ بهذه الصفة، ليُعرض تحت اسمه
    const worksOf = (role: string, id: string) => books.filter(
      (b) => (b.contributors ?? []).some((c) => c.person_id === id && c.role === role),
    ).length

    return peopleByRole(books)
      .map(({ role, ids }) => ({
        role,
        people: ids
          .map((id) => byId.get(id))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => ({ author: a, count: worksOf(role, a.id) }))
          .sort((a, b) => b.count - a.count || a.author.name.localeCompare(b.author.name, 'ar')),
      }))
      .filter((g) => g.people.length > 0)
  }, [books, authors])

  return (
    <main className="app-main" style={{ maxWidth: 1120, margin: '0 auto', padding: 32 }}>
      <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />

      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        المُحقِّقون ونحوهم
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        من عمل في كتب المكتبة بغير التأليف، مقسومين بصفاتهم. واضغط على اسمٍ
        لتصفُّح صفحته وما عمل فيه.
      </p>

      {groups.length === 0 ? (
        <EmptyState
          title="لم يُسجَّل أحدٌ بصفةٍ بعد"
          hint="تُسجَّل الصفةُ في نموذج الكتاب: المُحقِّق والمُراجِع ومن معهما."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map(({ role, people }) => (
            <section key={role} style={{ ...cardStyle, borderRadius: 13, padding: '16px 18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13,
                paddingBottom: 11, borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 9, flex: 'none',
                  background: 'color-mix(in oklch, var(--accent) 12%, transparent)',
                  color: 'var(--accent-soft)',
                }}>
                  <VerifyIcon size={16} />
                </span>
                {/* الصفةُ مجموعةً وعددُ أصحابها بين قوسين: «المُعتَنون (٤)» */}
                <span style={{ fontFamily: 'var(--heading-font)', fontSize: 17, fontWeight: 700 }}>
                  {roleGroupLabel(role)} ({formatNumber(people.length)})
                </span>
              </div>

              <div className="author-grid">
                {people.map(({ author, count }) => (
                  <div
                    key={author.id}
                    className="author-card"
                    onClick={() => navigate({ name: 'author', id: author.id })}
                  >
                    <span className="author-mark" aria-hidden="true">
                      {author.name.replace(/^ال/, '').trim().charAt(0) || '؟'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="author-name">{author.name}</div>
                      {deathLabel(author) && (
                        <div className="author-life">
                          <HourglassIcon size={12} />
                          {deathLabel(author)}
                        </div>
                      )}
                      {/* لا يُوصَل عددٌ باسمٍ إلا من `countLabel`: «كتابٌ
                          واحد» ثم «كتابان» ثم «٣ كتبٍ» ثم «١١ كتابًا» */}
                      <div className="author-books">
                        <OpenBookIcon size={12} />
                        {countLabel(count, BOOKS_COUNT)} في المكتبة
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
