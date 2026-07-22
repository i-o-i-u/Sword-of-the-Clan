import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { quoteOfTheDay, randomQuote, Quote } from '../lib/quotes'
import { View } from '../lib/useHashView'
import Logo from '../components/Logo'

interface Props {
  onNavigate: (v: View) => void
  onAddBook: () => void
}

interface Stats {
  totalBooks: number | null
  currentlyReading: number | null
  activeBorrows: number | null
  totalVisits: number | null
}

const CARDS: { view: View; title: string; desc: string; icon: string }[] = [
  { view: 'books', title: 'تصفّح الكتب', desc: 'ابحث في الفهرس وتصفّح الأغلفة والتصنيفات', icon: '📚' },
  { view: 'visits', title: 'سجلّ الزيارات', desc: 'من زار المكتبة ومتى', icon: '📝' },
  { view: 'borrows', title: 'سجلّ الاستعارات', desc: 'الكتب المستعارة وموعد إرجاعها', icon: '🔄' },
]

export default function Landing({ onNavigate, onAddBook }: Props) {
  const [quote, setQuote] = useState<Quote>(() => quoteOfTheDay())
  const [stats, setStats] = useState<Stats>({
    totalBooks: null,
    currentlyReading: null,
    activeBorrows: null,
    totalVisits: null,
  })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [books, reading, borrows, visits] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('books').select('id', { count: 'exact', head: true }).eq('reading_status', 'قيد القراءة'),
      supabase.from('borrows').select('id', { count: 'exact', head: true }).eq('status', 'مستعار'),
      supabase.from('visits').select('id', { count: 'exact', head: true }),
    ])
    setStats({
      totalBooks: books.count ?? 0,
      currentlyReading: reading.count ?? 0,
      activeBorrows: borrows.count ?? 0,
      totalVisits: visits.count ?? 0,
    })
  }

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-cover" aria-hidden="true">
          <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="hero-cover-svg">
            <defs>
              <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-hero-from)" />
                <stop offset="100%" stopColor="var(--color-hero-to)" />
              </linearGradient>
            </defs>
            <rect width="400" height="260" fill="url(#hero-bg)" />
            {/* رفوف كتب مبسّطة */}
            {[40, 90, 140, 190, 240, 290, 340].map((x, i) => (
              <rect
                key={x}
                x={x}
                y={90 + (i % 3) * 8}
                width="34"
                height={140 - (i % 3) * 8}
                rx="3"
                fill="var(--color-hero-book)"
                opacity={0.55 + (i % 3) * 0.12}
              />
            ))}
            <rect x="0" y="230" width="400" height="30" fill="var(--color-hero-shelf)" />
            <rect x="0" y="170" width="400" height="10" fill="var(--color-hero-shelf)" opacity="0.7" />
          </svg>
        </div>

        <div className="hero-overlay">
          <Logo size={72} className="hero-logo" />
          <h1 className="hero-title">مكتبة سيف العشيرة</h1>
          <p className="hero-subtitle">فهرس المكتبة المنزلية — كتبنا، زوّارنا، وما نستعيره من بعضنا</p>

          <blockquote className="hero-quote">
            <p>“{quote.text}”</p>
            <footer>
              — {quote.author}
              <button
                className="icon-btn quote-refresh"
                onClick={() => setQuote((q) => randomQuote(q.text))}
                aria-label="اقتباس آخر"
                title="اقتباس آخر"
              >
                🔁
              </button>
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="stats-strip">
        <StatTile label="كتاب في الفهرس" value={stats.totalBooks} icon="📖" />
        <StatTile label="قيد القراءة الآن" value={stats.currentlyReading} icon="🕮" />
        <StatTile label="استعارة قائمة" value={stats.activeBorrows} icon="🔄" />
        <StatTile label="زيارة مُسجَّلة" value={stats.totalVisits} icon="👣" />
      </section>

      <section className="action-cards">
        {CARDS.map((c) => (
          <button key={c.view} className="action-card" onClick={() => onNavigate(c.view)}>
            <span className="action-card-icon">{c.icon}</span>
            <span className="action-card-title">{c.title}</span>
            <span className="action-card-desc">{c.desc}</span>
          </button>
        ))}
        <button className="action-card action-card-primary" onClick={onAddBook}>
          <span className="action-card-icon">➕</span>
          <span className="action-card-title">إضافة كتاب</span>
          <span className="action-card-desc">يتطلّب تسجيل الدخول</span>
        </button>
      </section>
    </div>
  )
}

function StatTile({ label, value, icon }: { label: string; value: number | null; icon: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
