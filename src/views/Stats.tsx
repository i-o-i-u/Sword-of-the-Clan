// الإحصائيات (§٥-٧). كل رقمٍ هنا مشتقٌّ من مجموعة الكتب الظاهرة للقارئ،
// فالزائر لا تدخل في حسابه كتبٌ أُخفيت عنه.

import { useMemo } from 'react'
import { useLibrary } from '../lib/library'
import { RiyalGlyph, cardStyle } from '../components/ui'

export default function Stats() {
  const { books, loans, categories, settings, isOwner } = useLibrary()

  // ما أُطفئ عن الزوار يُحذف من هنا أيضًا، فلا تبقى بطاقةٌ تقرأ صفرًا أبدًا
  const showValue = isOwner || settings.visibility.value
  const showLoans = isOwner || settings.visibility.loans

  const s = useMemo(() => {
    const read = books.filter((b) => b.status === 'تم القراءة')
    const reading = books.filter((b) => b.status === 'قيد القراءة')
    const unread = books.filter((b) => b.status === 'لم تُقرأ')
    const rated = books.filter((b) => b.rating > 0)
    const total = books.length || 1

    const visibleIds = new Set(books.map((b) => b.id))
    const activeLoans = loans.filter((l) => !l.returned && visibleIds.has(l.book_id))

    const byCategory = categories
      .map((name) => {
        const count = books.filter((b) => b.category === name).length
        return { name, count, pct: Math.round((count / total) * 100) }
      })
      .filter((r) => r.count > 0)

    const authorCounts = new Map<string, number>()
    books.forEach((b) => {
      if (b.author_name) authorCounts.set(b.author_name, (authorCounts.get(b.author_name) ?? 0) + 1)
    })
    const byAuthor = [...authorCounts.entries()]
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return {
      total: books.length,
      pagesRead: read.reduce((sum, b) => sum + (b.pages ?? 0), 0),
      avgRating: rated.length ? (rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1) : '—',
      activeLoans: activeLoans.length,
      totalValue: books.reduce((sum, b) => sum + (b.value ?? 0), 0),
      readCount: read.length,
      readingCount: reading.length,
      unreadCount: unread.length,
      readPct: Math.round((read.length / total) * 100),
      readingPct: Math.round((reading.length / total) * 100),
      unreadPct: Math.round((unread.length / total) * 100),
      byCategory,
      byAuthor,
    }
  }, [books, loans, categories])

  const tile = { ...cardStyle, borderRadius: 12, padding: 18 } as const
  const bigNumber = { fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700 } as const
  const tileLabel = { fontSize: 13, color: 'var(--muted)' } as const

  return (
    <main className="app-main" style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>
        إحصائيات مكتبة سيف العشيرة
      </h1>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        <div style={tile}>
          <div style={bigNumber}>{s.total}</div>
          <div style={tileLabel}>إجمالي الكتب</div>
        </div>
        <div style={tile}>
          <div style={bigNumber}>{s.pagesRead}</div>
          <div style={tileLabel}>صفحة مقروءة</div>
        </div>
        <div style={tile}>
          <div style={bigNumber}>{s.avgRating}</div>
          <div style={tileLabel}>متوسط التقييم من 5</div>
        </div>
        {showLoans && (
          <div style={tile}>
            <div style={bigNumber}>{s.activeLoans}</div>
            <div style={tileLabel}>كتاب مُعار حاليًا</div>
          </div>
        )}
        {showValue && (
          <div style={tile}>
            <div style={bigNumber}>{s.totalValue}</div>
            <div style={{ ...tileLabel, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>قيمة المكتبة</span>
              {settings.currency === 'ريال' ? <RiyalGlyph /> : <span>({settings.currency})</span>}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, borderRadius: 12, padding: 22, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
          حالة القراءة
        </div>
        <div style={{ display: 'flex', height: 22, borderRadius: 999, overflow: 'hidden', marginBottom: 10, background: 'var(--header)' }}>
          <div style={{ background: 'oklch(0.5 0.08 150)', width: `${s.readPct}%` }} />
          <div style={{ background: 'var(--star)', width: `${s.readingPct}%` }} />
          <div style={{ background: 'oklch(0.7 0.01 60)', width: `${s.unreadPct}%` }} />
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span>● تمت قراءتها ({s.readCount})</span>
          <span>● قيد القراءة ({s.readingCount})</span>
          <span>● لم تُقرأ ({s.unreadCount})</span>
        </div>
      </div>

      <div className="stats-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <BarCard title="حسب التصنيف" rows={s.byCategory} color="oklch(0.42 0.09 45)" />
        <BarCard title="أكثر المؤلفين حضورًا" rows={s.byAuthor} color="oklch(0.38 0.1 25)" />
      </div>
    </main>
  )
}

function BarCard(
  { title, rows, color }: { title: string; rows: { name: string; count: number; pct: number }[]; color: string },
) {
  return (
    <div style={{ ...cardStyle, borderRadius: 12, padding: 22 }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>لا شيء بعد.</div>}
      {rows.map((row) => (
        <div key={row.name} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 10 }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
            <span style={{ color: 'var(--muted)' }}>{row.count}</span>
          </div>
          <div style={{ background: 'var(--header)', borderRadius: 999, height: 8 }}>
            <div style={{ background: color, height: 8, borderRadius: 999, width: `${row.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
