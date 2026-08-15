// منتقي تاريخٍ هجريّ: لسنة النشر وتاريخ الوُرود.
//
// سنةُ النشر لا يُسأل عن يومها — لا يُعرف في الطبعات أصلًا — أمّا تاريخُ
// الوُرود فيُعرف يومُه، فيقبل المنتقي الأيام حين يُطلب ذلك (`withDay`).
// والشهر واليوم اختياريّان في الحالين: قد تُعرف السنة وحدها.
//
// وما لم يُعرف على التعيين يُكتب نصًّا: «نحو ١٤٠٠ هـ»، فمربّع «تاريخٌ
// تقريبيّ» يُخفي التقويم ويُظهر حقل الكتابة مكانه.

import { useEffect, useRef, useState } from 'react'
import { HIJRI_MONTHS, WEEKDAYS, hijriMonthDays, hijriToday, toArabicDigits } from '../lib/hijri'
import { parseNumber } from '../lib/types'
import { ArrowIcon } from './ui'

export interface HijriYear {
  year: number | null
  month: number | null
  /** اليوم، لمن قبِل الأيام. والفراغ: لم يُحدَّد. */
  day?: number | null
  approx: boolean
  text: string
}

interface Props {
  label: string
  value: HijriYear
  onChange: (next: HijriYear) => void
  /** يقبل اختيار اليوم مع الشهر والسنة */
  withDay?: boolean
}

/** «١٢ رجب ١٤٤٨ هـ» أو «رجب ١٤٤٨ هـ» أو «١٤٤٨ هـ» أو نصّ التقريب كما كُتب */
export function hijriYearLabel(v: HijriYear): string {
  if (v.approx) return v.text.trim()
  if (v.year === null) return ''
  const year = `${toArabicDigits(v.year)} هـ`
  if (!v.month) return year
  const month = `${HIJRI_MONTHS[v.month - 1]} ${year}`
  return v.day ? `${toArabicDigits(v.day)} ${month}` : month
}

export default function HijriYearPicker({ label, value, onChange, withDay = false }: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => value.year ?? hijriToday().y)
  // الشهر المعروض في شبكة الأيام. لا يُستعمل إلا حين يقبل المنتقي الأيام.
  const [viewMonth, setViewMonth] = useState<number | null>(() => value.month ?? null)
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
            if (!open) {
              setViewYear(value.year ?? hijriToday().y)
              setViewMonth(value.month ?? null)
            }
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
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 40, width: 288,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 18px 40px oklch(0.2 0.02 50 / 0.25)', padding: 12,
        }}>
          {/* السنة تُكتب رقمًا هنا، أو تُبلَغ بالسهمين. والسهمُ سهمٌ مرسومٌ
              لا حرفُ قوسٍ: يُعرف اتجاهُه بالنظر، والسابقُ في العربية عن
              اليمين فرأسُه إليه. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              title="السنة السابقة"
              aria-label="السنة السابقة"
              onClick={() => setViewYear((y) => Math.max(1, y - 1))}
              style={stepStyle}
            >
              <ArrowIcon size={16} />
            </button>
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
            <button
              type="button"
              title="السنة التالية"
              aria-label="السنة التالية"
              onClick={() => setViewYear((y) => y + 1)}
              style={stepStyle}
            >
              <ArrowIcon size={16} dir="left" />
            </button>
          </div>

          {/* الأشهر أوّلًا. فإن قبِل المنتقي الأيام وكان الشهر مختارًا حلّت
              شبكةُ أيامه محلَّها، ويُرجع إليها من زرّ «الأشهر». */}
          {withDay && viewMonth ? (
            <DayGrid
              year={viewYear}
              month={viewMonth}
              selected={value.year === viewYear && value.month === viewMonth ? (value.day ?? null) : null}
              onBack={() => setViewMonth(null)}
              onPick={(day) => {
                onChange({ ...value, year: viewYear, month: viewMonth, day })
                setOpen(false)
              }}
              onMonthOnly={() => {
                onChange({ ...value, year: viewYear, month: viewMonth, day: null })
                setOpen(false)
              }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {HIJRI_MONTHS.map((name, i) => {
                const on = value.year === viewYear && value.month === i + 1
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      // مع الأيام: اختيارُ الشهر يفتح أيامه ولا يُغلق اللوحة
                      if (withDay) { setViewMonth(i + 1); return }
                      onChange({ ...value, year: viewYear, month: i + 1, day: null })
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
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10,
            paddingTop: 8, borderTop: '1px solid var(--border)',
          }}>
            {/* أكثر الطبعات لا يُعرف شهرها، فهذا هو الاختيار المعتاد */}
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, year: viewYear, month: null, day: null })
                setOpen(false)
              }}
              style={{ border: 'none', background: 'none', color: 'var(--accent-soft)', fontSize: 12, fontWeight: 600 }}
            >
              السنة وحدها ({toArabicDigits(viewYear)} هـ)
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, year: null, month: null, day: null })
                setOpen(false)
              }}
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

/**
 * شبكةُ أيام شهرٍ هجريّ، على تقويم أم القرى لا على تقريبٍ حسابيّ. تظهر بعد
 * اختيار الشهر في المنتقي الذي يقبل الأيام، ومنها يُرجَع إلى الأشهر.
 */
function DayGrid(
  { year, month, selected, onPick, onBack, onMonthOnly }: {
    year: number
    month: number
    selected: number | null
    onPick: (day: number) => void
    onBack: () => void
    onMonthOnly: () => void
  },
) {
  const days = hijriMonthDays(year, month)
  const leading = days.length ? days[0].weekday : 0

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 8,
      }}>
        <button
          type="button"
          onClick={onBack}
          title="العودة إلى الأشهر"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
            background: 'none', color: 'var(--accent-soft)', fontSize: 12, fontWeight: 600, padding: 0,
          }}
        >
          <ArrowIcon size={13} />
          الأشهر
        </button>
        <span style={{ fontFamily: 'var(--heading-font)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {HIJRI_MONTHS[month - 1]} {toArabicDigits(year)} هـ
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 3 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', padding: '3px 0' }}>
            {w.replace(/^ال/, '').slice(0, 3)}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: leading }, (_, i) => <span key={`blank-${i}`} />)}
        {days.map((d) => {
          const on = selected === d.d
          return (
            <button
              key={d.d}
              type="button"
              onClick={() => onPick(d.d)}
              style={{
                padding: '6px 0', borderRadius: 7, fontSize: 12.5, border: 'none', width: '100%',
                background: on ? 'var(--accent)' : 'none',
                color: on ? 'var(--on-accent)' : 'var(--text)',
                fontWeight: on ? 700 : 400,
              }}
            >
              {toArabicDigits(d.d)}
            </button>
          )
        })}
      </div>

      {/* قد يُعرف الشهر ولا يُعرف اليوم، فله مخرجٌ من هنا */}
      <button
        type="button"
        onClick={onMonthOnly}
        style={{
          marginTop: 8, border: 'none', background: 'none', color: 'var(--muted)',
          fontSize: 11.5, padding: 0,
        }}
      >
        الشهر وحده بلا يوم
      </button>
    </div>
  )
}

const fieldStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 14, minWidth: 0, width: '100%',
} as const

const stepStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--accent-soft)',
} as const
