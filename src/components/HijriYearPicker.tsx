// منتقي سنةٍ هجريّة بالأشهر دون الأيام: لسنة النشر وتاريخ الوُرود.
//
// اليوم لا يُسأل عنه لأنه لا يُعرف في الطبعات أصلًا، والشهر اختياريّ فقد
// تُعرف السنة وحدها. وما لم يُعرف على التعيين يُكتب نصًّا: «نحو ١٤٠٠ هـ»،
// فمربّع «تاريخٌ تقريبيّ» يُخفي التقويم ويُظهر حقل الكتابة مكانه.

import { useEffect, useRef, useState } from 'react'
import { HIJRI_MONTHS, hijriToday, toArabicDigits } from '../lib/hijri'
import { parseNumber } from '../lib/types'

export interface HijriYear {
  year: number | null
  month: number | null
  approx: boolean
  text: string
}

interface Props {
  label: string
  value: HijriYear
  onChange: (next: HijriYear) => void
}

/** «رجب ١٤٤٨ هـ» أو «١٤٤٨ هـ» أو نصّ التقريب كما كُتب */
export function hijriYearLabel(v: HijriYear): string {
  if (v.approx) return v.text.trim()
  if (v.year === null) return ''
  const year = `${toArabicDigits(v.year)} هـ`
  return v.month ? `${HIJRI_MONTHS[v.month - 1]} ${year}` : year
}

export default function HijriYearPicker({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => value.year ?? hijriToday().y)
  const boxRef = useRef<HTMLDivElement>(null)

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

  const shown = hijriYearLabel(value)

  return (
    <div
      ref={boxRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--muted)', position: 'relative' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {label}
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={value.approx}
            onChange={(e) => {
              setOpen(false)
              onChange({ ...value, approx: e.target.checked })
            }}
          />
          تاريخٌ تقريبيّ
        </label>
      </span>

      {value.approx ? (
        <input
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder="مثال: نحو ١٤٠٠ هـ"
          style={fieldStyle}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!open) setViewYear(value.year ?? hijriToday().y)
            setOpen((v) => !v)
          }}
          style={{
            ...fieldStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            color: shown ? 'var(--text)' : 'var(--muted)', textAlign: 'start',
          }}
        >
          <span>{shown || 'اختر السنة'}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M3.5 9.6h17M8.2 3.5v3M15.8 3.5v3" />
          </svg>
        </button>
      )}

      {open && !value.approx && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 40, width: 280,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 18px 40px oklch(0.2 0.02 50 / 0.25)', padding: 12,
        }}>
          {/* السنة تُكتب رقمًا هنا، أو تُبلغ بالسهمين */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <button type="button" aria-label="سنة قبلها" onClick={() => setViewYear((y) => y - 1)} style={stepStyle}>›</button>
            <input
              value={toArabicDigits(viewYear)}
              onChange={(e) => {
                const n = parseNumber(e.target.value)
                if (n !== null && n > 0 && n < 2000) setViewYear(n)
              }}
              inputMode="numeric"
              aria-label="السنة الهجرية رقمًا"
              style={{
                ...fieldStyle, flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--heading-font)', color: 'var(--text)', padding: '7px 8px',
              }}
            />
            <button type="button" aria-label="سنة بعدها" onClick={() => setViewYear((y) => y + 1)} style={stepStyle}>‹</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {HIJRI_MONTHS.map((name, i) => {
              const on = value.year === viewYear && value.month === i + 1
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange({ ...value, year: viewYear, month: i + 1 })
                    setOpen(false)
                  }}
                  style={{
                    padding: '7px 2px', borderRadius: 7, fontSize: 12, border: 'none',
                    background: on ? 'var(--accent)' : 'none',
                    color: on ? 'var(--on-accent)' : 'var(--text)',
                    fontWeight: on ? 700 : 400,
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 10,
            paddingTop: 8, borderTop: '1px solid var(--border)',
          }}>
            {/* أكثر الطبعات لا يُعرف شهرها، فهذا هو الاختيار المعتاد */}
            <button
              type="button"
              onClick={() => { onChange({ ...value, year: viewYear, month: null }); setOpen(false) }}
              style={{ border: 'none', background: 'none', color: 'var(--accent-soft)', fontSize: 12, fontWeight: 600 }}
            >
              السنة وحدها ({toArabicDigits(viewYear)} هـ)
            </button>
            <button
              type="button"
              onClick={() => { onChange({ ...value, year: null, month: null }); setOpen(false) }}
              style={{ border: 'none', background: 'none', color: 'var(--muted)', fontSize: 12 }}
            >
              مسح
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const fieldStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, width: '100%',
} as const

const stepStyle = {
  border: 'none', background: 'none', color: 'var(--text)', fontSize: 17, padding: '2px 8px',
} as const
