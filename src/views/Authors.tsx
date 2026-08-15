// المؤلِّفون (§٥-٤ و§٥-٥). ترتيبهم بأقدمية الوفاة، والأقدمُ أوّلًا، ومن لا
// تاريخ له يُؤخَّر. وهذا الترتيب نفسه هو ترتيب المكتبة الافتراضي.
//
// وصفحة المؤلِّف عرضٌ لا تعديل، كصفحة الكتاب: بياناتُه وترجمتُه وكتبُه
// تُقرأ، وقلمٌ في أعلاها يفتح حقولَها لصاحب المكتبة. فلا يرى الفاهرسُ نموذجَ
// إدخالٍ وهو إنما جاء ليقرأ.

import { useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { lifeLabel, toHijriYear } from '../lib/hijri'
import { BOOKS_COUNT, ERAS, countLabel, parseNumber, type Era } from '../lib/types'
import ImageSlot from '../components/ImageSlot'
import {
  BackButton, DebouncedInput, DebouncedTextarea, EmptyState, HourglassIcon,
  OpenBookIcon, PencilIcon, QuillIcon, cardStyle,
} from '../components/ui'

export function AuthorsIndex() {
  const { authors, books } = useLibrary()

  const cards = useMemo(() => {
    const counts = new Map<string, number>()
    books.forEach((b) => {
      if (b.author_id) counts.set(b.author_id, (counts.get(b.author_id) ?? 0) + 1)
    })
    const sortValue = (death: number | null, era: Era) => toHijriYear(death, era) ?? 1e9
    return authors
      .slice()
      .sort((a, b) =>
        (sortValue(a.death, a.era) - sortValue(b.death, b.era)) || a.name.localeCompare(b.name, 'ar'))
      .map((a) => ({ author: a, count: counts.get(a.id) ?? 0 }))
  }, [authors, books])

  return (
    <main className="app-main" style={{ maxWidth: 1120, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
        مؤلِّفو المكتبة
      </h1>
      {/* الدعوةُ واحدةٌ للزائر وصاحب المكتبة: البطاقة تُدخِل إلى الصفحة،
          والتعديلُ فيها لا يُدعى إليه من هنا */}
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>
        مرتَّبون بحسب أقدمية الوفاة، الأقدمُ أوّلًا.
        اضغط على بطاقة مؤلِّفٍ لتصفُّح بياناته وترجمته وكُتُبه.
      </p>

      {cards.length === 0 ? (
        <EmptyState title="لا مؤلِّفين بعد" hint="يُنشأ للمؤلِّف صفحةٌ أوّلَ ما يُضاف له كتاب." />
      ) : (
        <div className="author-grid">
          {cards.map(({ author, count }) => (
            <div
              key={author.id}
              className="author-card"
              onClick={() => navigate({ name: 'author', id: author.id })}
            >
              {/* حرفُ الاسم الأول في قرصٍ: علامةٌ تُميّز البطاقة بلا صورة */}
              <span className="author-mark" aria-hidden="true">
                {author.name.replace(/^ال/, '').trim().charAt(0) || '؟'}
              </span>

              <div style={{ minWidth: 0 }}>
                <div className="author-name">{author.name}</div>
                <div className="author-life">
                  <HourglassIcon size={12} />
                  {lifeLabel(author)}
                </div>
                <div className="author-books">
                  <OpenBookIcon size={12} />
                  {countLabel(count, BOOKS_COUNT)} في المكتبة
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export function AuthorPage({ authorId }: { authorId: string }) {
  const { authors, books, canEdit, patchAuthor } = useLibrary()
  const author = authors.find((a) => a.id === authorId)

  // الصفحة عرضٌ حتى يُطلب التعديل، فالقلمُ هو ما يفتح الحقول
  const [editing, setEditing] = useState(false)

  const authorBooks = useMemo(
    () => books.filter((b) => b.author_id === authorId).sort((a, b) => a.title.localeCompare(b.title, 'ar')),
    [books, authorId],
  )

  if (!author) {
    return (
      <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <BackButton label="العودة إلى المؤلِّفين" onClick={() => navigate({ name: 'authors' })} />
        <EmptyState title="لم يُعثَر على هذا المؤلِّف" />
      </main>
    )
  }

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 14, width: '100%',
  } as const

  const label = { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, color: 'var(--muted)' }
  const open = canEdit && editing

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <BackButton label="العودة إلى المؤلِّفين" onClick={() => navigate({ name: 'authors' })} />
        {canEdit && (
          <button
            type="button"
            className="edit-pen"
            onClick={() => setEditing((v) => !v)}
            title={open ? 'إنهاء التعديل' : 'تعديل بيانات المؤلِّف'}
          >
            <PencilIcon size={16} />
            {open ? 'إنهاء التعديل' : 'تعديل بيانات المؤلِّف'}
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, borderRadius: 14, padding: '24px 26px', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <span className="author-mark author-mark-lg" aria-hidden="true">
            {author.name.replace(/^ال/, '').trim().charAt(0) || '؟'}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 30, fontWeight: 700, margin: 0 }}>
              {author.name}
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13.5, color: 'var(--muted)', marginTop: 4,
            }}>
              <HourglassIcon size={13} />
              {lifeLabel(author)}
            </span>
          </div>
        </div>

        {open ? (
          <>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
              <label style={label}>
                الاسم كما يُعرَض
                <DebouncedInput
                  value={author.name}
                  onCommit={(v) => { if (v.trim()) void patchAuthor(author.id, { name: v.trim() }) }}
                  style={inputStyle}
                />
              </label>
              <label style={label}>
                الاسم الكامل ونسبه
                <DebouncedInput
                  value={author.full_name}
                  onCommit={(v) => void patchAuthor(author.id, { full_name: v })}
                  placeholder="مثال: عبد الرحمن بن محمد بن خلدون الحضرمي"
                  style={inputStyle}
                />
              </label>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
              <label style={label}>
                سنة المولد
                <DebouncedInput
                  value={author.birth?.toString() ?? ''}
                  onCommit={(v) => void patchAuthor(author.id, { birth: parseNumber(v) })}
                  placeholder="مثال: ٧٣٢"
                  inputMode="numeric"
                  style={inputStyle}
                />
              </label>
              <label style={label}>
                سنة الوفاة
                <DebouncedInput
                  value={author.death?.toString() ?? ''}
                  onCommit={(v) => void patchAuthor(author.id, { death: parseNumber(v) })}
                  placeholder="مثال: ٨٠٨"
                  inputMode="numeric"
                  style={inputStyle}
                />
              </label>
              <label style={label}>
                التقويم
                <select
                  value={author.era}
                  onChange={(e) => void patchAuthor(author.id, { era: e.target.value as Era })}
                  style={inputStyle}
                >
                  {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </label>
            </div>

            <label style={label}>
              نبذة عن المؤلِّف
              <DebouncedTextarea
                value={author.bio}
                onCommit={(v) => void patchAuthor(author.id, { bio: v })}
                placeholder="ترجمةٌ موجزة: مذهبه، وشيوخه، وأثره…"
                style={{ ...inputStyle, minHeight: 110, lineHeight: 1.9, resize: 'vertical' }}
              />
            </label>

            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
              يُحفظ ما تكتبه من تلقائه بعد أن تكفّ عن الكتابة.
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {author.full_name && (
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{author.full_name}</div>
            )}
            {author.bio ? (
              <div className="prose" style={{ fontSize: 14.5 }}>{author.bio}</div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                لم تُكتب ترجمةٌ لهذا المؤلِّف بعد.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        fontFamily: 'var(--heading-font)', fontSize: 20, fontWeight: 700, marginBottom: 12,
      }}>
        <QuillIcon size={18} />
        مؤلَّفاته في المكتبة ({countLabel(authorBooks.length, BOOKS_COUNT)})
      </div>

      {authorBooks.length === 0 ? (
        <EmptyState title="لا كتب لهذا المؤلِّف في الفهرس بعد" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 18 }}>
          {authorBooks.map((book) => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => navigate({ name: 'book', id: book.id })}
              style={{ ...cardStyle, cursor: 'pointer', borderRadius: 12, overflow: 'hidden' }}
            >
              <div style={{ width: '100%', aspectRatio: '3/4', background: 'var(--cover-bg)' }}>
                <ImageSlot url={book.cover_url} folder="covers" canEdit={false} onUploaded={() => {}} placeholder="غلاف الكتاب" />
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 14.5, lineHeight: 1.35 }}>
                  {book.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{book.category}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
