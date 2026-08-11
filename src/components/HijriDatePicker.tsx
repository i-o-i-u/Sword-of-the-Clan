// منتقي التاريخ الهجري لتاريخ الاقتناء (§٧).
// الأشهر مبنيّة على تقويم أم القرى عبر Intl، لا على تقريبٍ حسابي.

import { useEffect, useRef, useState } from 'react'
import { HIJRI_MONTHS, WEEKDAYS, hijriLabel, hijriMonthDays, hijriToday } from '../lib/hijri'

interface Props {
  day: number | null
  month: number | null
  year: number | null
  onChange: (day: number | null, month: number | null, year: number | null) => void
}

export default function HijriDatePicker({ day, month, year, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => year ?? hijriToday().y)
  const [viewMonth, setViewMonth] = useState(() => month ?? hijriToday().m)
  const boxRef = useRef<HTMLDivElement>(null)

  // النقر خارج المنتقي أو مفتاح الهروب يُغلقه
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open) {
      const today = hijriToday()
      setViewYear(year ?? today.y)
      setViewMonth(month ?? today.m)
    }
    setOpen((v) => !v)
  }

  const label = hijriLabel(day, month, year)
  const days = open ? hijriMonthDays(viewYear, viewMonth) : []
  const leading = days.length ? days[0].weekday : 0

  const cellBase = {
    textAlign: 'center' as const, padding: '7px 0', borderRadius: 7,
    fontSize: 12.5, border: 'none', background: 'none', color: 'var(--text)', width: '100%',
  }

  return (
    <div ref={boxRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)', position: 'relative' }}>
      تاريخ الاقتناء (هجري)
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
          fontSize: 14, background: 'var(--bg)', color: label ? 'var(--text)' : 'var(--muted)',
          minWidth: 0, width: '100%',
        }}
      >
        <span>{label || 'اختر التاريخ'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 9.6h17M8.2 3.5v3M15.8 3.5v3" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 40, width: 268,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 18px 40px oklch(0.2 0.02 50 / 0.25)', padding: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              type="button"
              aria-label="الشهر السابق"
              onClick={() => {
                let m = viewMonth - 1, y = viewYear
                if (m < 1) { m = 12; y -= 1 }
                setViewMonth(m); setViewYear(y)
              }}
              style={{ border: 'none', background: 'none', color: 'var(--text)', fontSize: 17, padding: '2px 8px' }}
            >›</button>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {HIJRI_MONTHS[viewMonth - 1]} {viewYear} هـ
            </div>
            <button
              type="button"
              aria-label="الشهر التالي"
              onClick={() => {
                let m = viewMonth + 1, y = viewYear
                if (m > 12) { m = 1; y += 1 }
                setViewMonth(m); setViewYear(y)
              }}
              style={{ border: 'none', background: 'none', color: 'var(--text)', fontSize: 17, padding: '2px 8px' }}
            >‹</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted)', padding: '3px 0' }}>{w}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array.from({ length: leading }, (_, i) => <div key={`blank-${i}`} style={{ padding: '7px 0' }} />)}
            {days.map((d) => {
              const selected = day === d.d && month === viewMonth && year === viewYear
              return (
                <button
                  key={d.d}
                  type="button"
                  onClick={() => { onChange(d.d, viewMonth, viewYear); setOpen(false) }}
                  style={selected
                    ? { ...cellBase, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 700 }
                    : cellBase}
                >
                  {d.d}
                </button>
              )
            })}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 10,
            paddingTop: 8, borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={() => {
                const t = hijriToday()
                onChange(t.d, t.m, t.y)
                setOpen(false)
              }}
              style={{ border: 'none', background: 'none', color: 'var(--accent-soft)', fontSize: 12 }}
            >تاريخ اليوم</button>
            <button
              type="button"
              onClick={() => { onChange(null, null, null); setOpen(false) }}
              style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12 }}
            >مسح</button>
          </div>
        </div>
      )}
    </div>
  )
}
