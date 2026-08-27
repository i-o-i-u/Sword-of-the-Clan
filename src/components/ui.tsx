// القطع الصغيرة المشتركة وأنماطها. القيم مأخوذة من رموز التصميم كما هي (§٩).

import {
  useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import { formatNumber, starsText } from '../lib/types'

/** يحلّ روابط الصور: المرفوعة مطلقة، والمرافقة للموقع نسبيّة إلى مسار النشر */
export function resolveAsset(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^(https?:|data:|blob:)/.test(url)) return url
  return import.meta.env.BASE_URL + url.replace(/^\//, '')
}

// ----------------------------------------------------------------- الأنماط
export const tabStyle = (active: boolean): CSSProperties => ({
  border: 'none',
  background: active ? 'var(--accent)' : 'none',
  color: active ? 'var(--on-accent)' : 'var(--text)',
  fontWeight: active ? 600 : 400,
  fontSize: 14,
  padding: '8px 16px',
  borderRadius: 8,
})

export const outlineTabStyle = (active: boolean): CSSProperties => ({
  ...tabStyle(active),
  border: active ? 'none' : '1px solid var(--border)',
})

export const facetStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: active ? 'oklch(0.93 0.03 45)' : 'none',
  color: active ? 'oklch(0.32 0.08 40)' : 'var(--text)',
  fontWeight: active ? 700 : 400,
  fontSize: 13.5,
  padding: '6px 8px',
  borderRadius: 6,
  textAlign: 'right',
})

export const countPillStyle = (active: boolean): CSSProperties => ({
  fontSize: 11,
  color: active ? 'var(--on-accent)' : 'var(--muted)',
  background: active ? 'var(--accent)' : 'var(--header)',
  padding: '1px 7px',
  borderRadius: 999,
  flex: 'none',
})

export const viewToggleStyle = (active: boolean): CSSProperties => ({
  border: 'none',
  background: active ? 'var(--surface)' : 'none',
  color: active ? 'var(--text)' : 'var(--muted)',
  fontWeight: active ? 600 : 400,
  fontSize: 12.5,
  padding: '5px 12px',
  borderRadius: 6,
  boxShadow: active ? '0 1px 3px oklch(0.24 0.02 50 / 0.15)' : undefined,
  whiteSpace: 'nowrap',
})

export const chipStyle = (on: boolean): CSSProperties => ({
  border: on ? '1px solid var(--accent)' : '1px solid var(--border)',
  background: on ? 'oklch(0.42 0.09 45 / 0.12)' : 'none',
  color: on ? 'var(--text)' : 'var(--muted)',
  fontWeight: on ? 600 : 400,
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 12,
})

export const primaryButtonStyle = (enabled = true): CSSProperties => ({
  background: enabled ? 'var(--accent)' : 'var(--border)',
  color: enabled ? 'var(--on-accent)' : 'var(--muted)',
  border: 'none',
  borderRadius: 9,
  padding: '12px',
  fontSize: 15,
  fontWeight: 700,
  cursor: enabled ? 'pointer' : 'not-allowed',
})

export const ghostButtonStyle: CSSProperties = {
  border: '1px solid var(--accent)',
  background: 'none',
  color: 'var(--accent)',
  borderRadius: 8,
  padding: '7px 15px',
  fontSize: 13,
  fontWeight: 600,
}

export const iconButtonStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 8,
  borderRadius: 8,
  color: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const inputStyle: CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 14,
  minWidth: 0,
  width: '100%',
}

export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: 'var(--muted)',
}

export const cardStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
}

// ---------------------------------------------------------------- القطع

/** مفتاح تبديل: مسار ٤٢×٢٤ وكرة ١٨ (§٩) */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', padding: 2,
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? 'var(--accent)' : 'var(--border)',
        flex: 'none', transition: 'background .16s',
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'oklch(0.98 0.01 75)', display: 'block' }} />
    </button>
  )
}

/** صف: عنوان وشرحٌ تحته، ومفتاح تبديل في طرفه */
export function ToggleRow(
  { label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: () => void },
) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</div>}
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  )
}

/** رمز الريال السعودي، يظهر مع كل قيمة حين تكون العملة ريالًا */
export function RiyalGlyph() {
  return (
    <svg viewBox="0 0 1124.14 1256.39" aria-label="ريال" style={{ width: 12, height: 13.4, fill: 'currentColor', opacity: 0.8 }}>
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
    </svg>
  )
}

/** يعرض المبلغ مع رمز الريال أو اسم العملة */
export function Money({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span>{formatNumber(amount)}</span>
      {currency === 'ريال' ? <RiyalGlyph /> : <span>({currency})</span>}
    </span>
  )
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 12, color: 'var(--star)', letterSpacing: 1 }}>{starsText(rating)}</span>
  )
}

/** شارة حالة القراءة في الجدول */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, CSSProperties> = {
    'مقروء': { color: 'oklch(0.36 0.09 150)', background: 'oklch(0.93 0.04 150)' },
    'قيد القراءة': { color: 'oklch(0.42 0.11 70)', background: 'oklch(0.94 0.05 78)' },
  }
  const tone = map[status] ?? { color: 'var(--muted)', background: 'var(--header)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', ...tone }}>
      {status || '—'}
    </span>
  )
}

export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function SunIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 0.8v2M8 13.2v2M15.2 8h-2M2.8 8h-2M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4M13.1 13.1l-1.4-1.4M4.3 4.3L2.9 2.9"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  )
}

export function GearIcon({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.3 14.6a1.6 1.6 0 0 0 .33 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.06-.06a1.6 1.6 0 0 0-1.77-.33 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.33l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .33-1.77 1.6 1.6 0 0 0-1.47-.97H3.4a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.33-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.33h.08a1.6 1.6 0 0 0 .97-1.47V3.4a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.33l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.33 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.47.97z" />
    </svg>
  )
}

/**
 * أيقونات الأزرار. كلها بمقاسٍ واحد (٢٤) وبلونٍ موروث، فيكفي تمرير `size`
 * لتتّسق مع نصّ الزر الذي هي فيه.
 */
type IconProps = { size?: number }

const strokeIcon = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

/** كتبٌ على رفّ — الدخول إلى المكتبة */
export function BooksIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3" y="5" width="4" height="13" rx="1" />
      <rect x="8.5" y="5" width="4" height="13" rx="1" />
      <path d="M15.4 6.3l3.4.9-2.6 10.3-3.4-.9z" />
      <path d="M2 20.5h20" />
    </svg>
  )
}

/** بيتٌ بجملونه — الصفحة الأولى */
export function HomeIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M3.6 10.4L12 3.8l8.4 6.6" />
      <path d="M5.6 12v8.2h12.8V12" />
      <path d="M9.9 20.2v-5h4.2v5" />
    </svg>
  )
}

/** كتابٌ وعليه زائد — إضافة كتاب */
export function BookPlusIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M4 4.8h9.6a2 2 0 0 1 2 2v12.4H6a2 2 0 0 1-2-2z" />
      <path d="M6 19.2a2 2 0 0 1 0-4h9.6" />
      <path d="M19 6.4v5.4M16.3 9.1h5.4" />
    </svg>
  )
}

/** قلمٌ — تعديل بيانات الكتاب */
export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M16.4 3.9a2.1 2.1 0 0 1 3 3L8.2 18.1l-4 1 1-4z" />
      <path d="M14.6 5.7l3.7 3.7" />
    </svg>
  )
}

/** آلةٌ حاسبة — حاسبة القراءة، في زرّها وفي رأس نافذتها */
export function CalculatorIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="4.4" y="2.8" width="15.2" height="18.4" rx="2.4" />
      <path d="M7.6 6.6h8.8v3.2H7.6z" />
      <path d="M8.4 13.4h.01M12 13.4h.01M15.6 13.4h.01M8.4 17.4h.01M12 17.4h.01M15.6 17.4h.01" />
    </svg>
  )
}

/** رأسُ إنسانٍ وكتفاه — اسم صاحب المكتبة */
export function OwnerIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20.2c0-3.6 3.2-5.8 7.2-5.8s7.2 2.2 7.2 5.8" />
    </svg>
  )
}

/** عينٌ ناظرة — وضع التصفُّح فقط */
export function EyeIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M2.4 12S6 5.8 12 5.8 21.6 12 21.6 12 18 18.2 12 18.2 2.4 12 2.4 12z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  )
}

/** بابٌ وسهمٌ خارجٌ منه — الخروج */
export function ExitIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M14.4 4.2H6.2a1.6 1.6 0 0 0-1.6 1.6v12.4a1.6 1.6 0 0 0 1.6 1.6h8.2" />
      <path d="M17.6 15.2 20.8 12l-3.2-3.2" />
      <path d="M20.4 12H10.2" />
    </svg>
  )
}

/** مِطبعةٌ بلوحها — دُوْر النَّشْر */
export function PressIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M6 3.6h12v4.2H6z" />
      <path d="M4.2 7.8h15.6v6.4H4.2z" />
      <path d="M7.4 14.2h9.2v6.2H7.4z" />
      <path d="M9.6 17.2h4.8" />
    </svg>
  )
}

/** قلمٌ من ريش — المؤلِّفون */
export function QuillIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M20.5 3.5c-8.6.9-13 5.2-14.6 10.7l3.9 3.9c5.5-1.6 9.8-6 10.7-14.6z" />
      <path d="M9.8 18.1L14 13.9" />
      <path d="M3.5 20.5l3.2-3.2" />
    </svg>
  )
}

/** واجهة مكتبةٍ بأعمدتها — عن المكتبة */
export function LibraryIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M3.4 9.7L12 4.4l8.6 5.3" />
      <path d="M5.3 9.7h13.4" />
      <path d="M7.3 12.2v5.6M12 12.2v5.6M16.7 12.2v5.6" />
      <path d="M4.4 20.3h15.2" />
    </svg>
  )
}

/** دبّوس موضع — سطر مكان المكتبة */
export function PinIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M12 21c4.2-4.6 6.3-8 6.3-10.9A6.3 6.3 0 0 0 5.7 10.1C5.7 13 7.8 16.4 12 21z" />
      <circle cx="12" cy="10.1" r="2.4" />
    </svg>
  )
}

/** أعمدةٌ متفاوتة — الإحصائيات */
export function ChartIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M4 20h16" />
      <path d="M7 20V12.5M12 20V5.5M17 20v-5" />
    </svg>
  )
}

/** كتابٌ مفتوحٌ وفوقه لمعة — اقترح لي كتابًا */
export function SuggestIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M11.5 8.2C9.4 6.9 6.9 6.4 3.5 6.6v11.6c3.4-.2 5.9.3 8 1.6 2.1-1.3 4.6-1.8 8-1.6V9.6" />
      <path d="M11.5 8.2v11.6" />
      <path d="M18.2 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </svg>
  )
}

/** هلالٌ — يظهر بدل الشمس حين يكون المظهر داكنًا */
export function MoonIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.7 8.7 0 1 0 11.3 11.3z" />
    </svg>
  )
}

/** شعار إكس */
export function XIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
    </svg>
  )
}

/** شعار تلجرام */
export function TelegramIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.9-.86.2-1.3l15.97-6.16c.73-.27 1.37.18 1.13 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  )
}

/** حلقاتٌ مسلسلة — صفحة السلاسل */
export function SeriesIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="2.8" y="7.4" width="5.4" height="9.2" rx="1.2" />
      <rect x="9.3" y="5.6" width="5.4" height="12.8" rx="1.2" />
      <rect x="15.8" y="7.4" width="5.4" height="9.2" rx="1.2" />
      <path d="M8.2 12h1.1M14.7 12h1.1" />
    </svg>
  )
}

/** شريطُ علامةٍ في كتاب — صفحة الفوائد والمقتطفات */
export function PerkIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M6.4 3.6h11.2a1.4 1.4 0 0 1 1.4 1.4v15.4l-7-4-7 4V5a1.4 1.4 0 0 1 1.4-1.4z" />
      <path d="M9 8.6h6M9 12h4" />
    </svg>
  )
}

/** ساعةٌ صغيرة — بجانب توقيت مكة */
export function ClockIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
    </svg>
  )
}

/* ----------------------------------------------- أيقونات البيانات والعرض */
/* لكل قسمٍ من أقسام بطاقة الكتاب أيقونتُه، ولكل عمودٍ من أعمدة الجدول، ولكل
   طريقة عرض. كلها على المقاس نفسه وبلونٍ موروث كسابقاتها. */

/** كتابٌ مفتوح — قسم بيانات الكتاب */
export function OpenBookIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M12 6.6C10.2 5.2 7.6 4.6 4 4.8v12.6c3.6-.2 6.2.4 8 1.8 1.8-1.4 4.4-2 8-1.8V4.8c-3.6-.2-6.2.4-8 1.8z" />
      <path d="M12 6.6v12.6" />
    </svg>
  )
}

/** بطاقةٌ بأسطر — قسم بيانات النسخة */
export function ArchiveIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.2" y="4.4" width="17.6" height="4.4" rx="1.2" />
      <path d="M5 8.8v9a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-9" />
      <path d="M9.8 12.6h4.4" />
    </svg>
  )
}

/**
 * مجلَّدٌ في جوفه عناوين — «مطبوعٌ معه» و«مطبوعٌ فيه».
 *
 * ودلالتُه: غلافٌ واحد وفيه عناوينُ مسطورة، فهي كتبٌ تُعدّ ولا يُعدّ لها ورق.
 */
export function WithinIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.4" y="4.2" width="17.2" height="15.6" rx="1.8" />
      <path d="M8.2 4.2v15.6" />
      <path d="M11.6 9.2h5.6" />
      <path d="M11.6 12.6h5.6" />
      <path d="M11.6 16h3.4" />
    </svg>
  )
}

/** حرف المعلومة في دائرة — قسم عن الكتاب */
export function InfoIcon({ size = 18 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.2" />
      <path d="M12 7.9h.01" />
    </svg>
  )
}

/** ساعةٌ رمليّة — تاريخ الوفاة */
export function HourglassIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M6.6 3.4h10.8" />
      <path d="M6.6 20.6h10.8" />
      <path d="M7.8 3.4v3.2c0 2 1.6 3.6 4.2 5.4 2.6 1.8 4.2 3.4 4.2 5.4v3.2" />
      <path d="M16.2 3.4v3.2c0 2-1.6 3.6-4.2 5.4-2.6 1.8-4.2 3.4-4.2 5.4v3.2" />
    </svg>
  )
}

/** عدسةٌ على سطر — المُحقِّق ومن على صفته */
export function VerifyIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="10.4" cy="10.4" r="5" />
      <path d="M14.2 14.2l4.6 4.6" />
      <path d="M8.2 10.4l1.6 1.6 3-3.2" />
    </svg>
  )
}

/** بطاقةُ وسمٍ — التصنيف */
export function TagIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M11.4 3.4H4.2a.8.8 0 0 0-.8.8v7.2c0 .2.1.4.2.6l8.4 8.4a.8.8 0 0 0 1.2 0l7.2-7.2a.8.8 0 0 0 0-1.2L12 3.6a.8.8 0 0 0-.6-.2z" />
      <path d="M7.6 7.6h.01" />
    </svg>
  )
}

/** دولابُ كتبٍ برفوفه — موضع الكتاب */
export function CabinetIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.6" y="3.2" width="16.8" height="17.6" rx="1.8" />
      <path d="M3.6 9.1h16.8M3.6 14.9h16.8" />
      <path d="M8.4 6.2h.01M8.4 12h.01M8.4 17.8h.01" />
    </svg>
  )
}

/** مِربَّعٌ بعلامة الرقم — الرقم المسلسل */
export function HashIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M9.4 3.6L7.6 20.4M16.4 3.6l-1.8 16.8" />
      <path d="M3.8 9h16.4M3.2 15h16.4" />
    </svg>
  )
}

/** ورقةٌ مطويّة الركن — عدد الصفحات */
export function PagesIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M13.4 3.4H6.8A1.8 1.8 0 0 0 5 5.2v13.6a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V8.8z" />
      <path d="M13.4 3.4v5.4h5.6" />
      <path d="M8.6 13h6.8M8.6 16.6h4.6" />
    </svg>
  )
}

/** طبقاتٌ متراكبة — عدد المجلَّدات */
export function VolumesIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M12 3.2l8.4 4.2-8.4 4.2-8.4-4.2z" />
      <path d="M3.6 12L12 16.2 20.4 12" />
      <path d="M3.6 16.4L12 20.6l8.4-4.2" />
    </svg>
  )
}

/** مربَّعاتٌ أربعة — العرض في صورة شبكة */
export function GridIcon({ size = 17 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.4" y="3.4" width="7.4" height="7.4" rx="1.4" />
      <rect x="13.2" y="3.4" width="7.4" height="7.4" rx="1.4" />
      <rect x="3.4" y="13.2" width="7.4" height="7.4" rx="1.4" />
      <rect x="13.2" y="13.2" width="7.4" height="7.4" rx="1.4" />
    </svg>
  )
}

/** جدولٌ بصفوفه — العرض في صورة جدول */
export function TableIcon({ size = 17 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.2" y="4.4" width="17.6" height="15.2" rx="1.8" />
      <path d="M3.2 9.4h17.6M3.2 14.6h17.6" />
      <path d="M9.6 4.4v15.2" />
    </svg>
  )
}

/** كعوبٌ قائمة على رفّ — العرض في صورة أَرْفُف */
export function ShelfIcon({ size = 17 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="4" y="5.2" width="3.4" height="12.6" rx="0.8" />
      <rect x="9.2" y="7.6" width="3.4" height="10.2" rx="0.8" />
      <path d="M15.2 6.4l3.3.9-2.4 10.6-3.3-.9z" />
      <path d="M2.8 20.4h18.4" />
    </svg>
  )
}

/** قُمعُ الترشيح — زرّ التصفيات */
export function FilterIcon({ size = 16 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M3.6 5.2h16.8l-6.6 7.6v6.2l-3.6 1.8v-8z" />
    </svg>
  )
}

/** سهمٌ لأسفل — فتحُ ما طُوي، ويُدار بالتحويل عند الفتح */
export function ChevronIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M6 9.4l6 6 6-6" />
    </svg>
  )
}

/** حرف الضرب في دائرة — إزالة ما أُثبت */
export function ClearIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6" />
    </svg>
  )
}

/** حلقتان متشابكتان — صلةُ الكتاب بغيره */
export function LinkIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
      <path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
    </svg>
  )
}

/** طومارٌ مطويّ الطرفين — الأجزاء والأسفار، تقسيمُ المؤلِّف لا المُجلِّد */
export function ScrollIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M6.4 3.6h11a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2h-11" />
      <path d="M6.4 3.6a2 2 0 0 0-2 2v2.2h4.2V5.6a2 2 0 0 0-2.2-2z" />
      <path d="M17.6 20.4a2 2 0 0 0 2-2v-2.2h-4.2v2.2a2 2 0 0 0 2.2 2z" />
      <path d="M9.2 8.6h6.6M9.2 12h6.6M9.2 15.4h4" />
    </svg>
  )
}

/** قطعةُ نقدٍ — القيمة التقديرية وأغلى الكتب */
export function CoinIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="5.2" />
      <path d="M12 8.4v7.2" />
    </svg>
  )
}

/** كرةٌ بخطوطها — بلدان النَّشْر */
export function GlobeIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.2c2.3 2.5 3.5 5.5 3.5 8.8S14.3 18.3 12 20.8c-2.3-2.5-3.5-5.5-3.5-8.8S9.7 5.7 12 3.2z" />
    </svg>
  )
}

/** ورقةُ تقويم — سنة النشر وأقدم الطبعات */
export function CalendarIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.6h17M8.2 3.5v3M15.8 3.5v3" />
    </svg>
  )
}

/** ورقةٌ على ورقة — نسخُ ما في البطاقة */
export function CopyIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <rect x="8.6" y="8.6" width="11.8" height="11.8" rx="2.2" />
      <path d="M15.4 5.6V5a1.6 1.6 0 0 0-1.6-1.6H5.2A1.6 1.6 0 0 0 3.6 5v8.6a1.6 1.6 0 0 0 1.6 1.6h.6" />
    </svg>
  )
}

/** صحٌّ — يظهر لحظةَ تمام النسخ بدل أيقونة الزرّ */
export function CheckIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M4.8 12.6l4.8 4.8 9.6-10.8" />
    </svg>
  )
}

/** مِطبعةٌ ورقيّة — طباعة البطاقة */
export function PrinterIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M7 8.6V3.6h10v5" />
      <path d="M5.4 8.6h13.2A2.4 2.4 0 0 1 21 11v5.2h-3.6" />
      <path d="M6.6 16.2H3V11a2.4 2.4 0 0 1 2.4-2.4" />
      <rect x="6.6" y="13.6" width="10.8" height="6.8" rx="1.2" />
    </svg>
  )
}

/** علامةُ اقتباس — نسخُ إحالة الكتاب لجريدة المراجع */
export function QuoteIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M9.6 6.4C6.7 7.6 5.2 9.9 5.2 13.2v4.4h5.2v-5.2H7.9c0-2 .6-3.4 2.2-4.2z" />
      <path d="M19 6.4c-2.9 1.2-4.4 3.5-4.4 6.8v4.4h5.2v-5.2h-2.5c0-2 .6-3.4 2.2-4.2z" />
    </svg>
  )
}

/** سهمٌ إلى صندوق — تنزيل الصورة */
export function DownloadIcon({ size = 15 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <path d="M12 3.6v11.2" />
      <path d="M7.6 10.6L12 15l4.4-4.4" />
      <path d="M4.4 17.4v1.4a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-1.4" />
    </svg>
  )
}

/** عدسةٌ وفيها زائد أو ناقص — تكبير الصورة وتصغيرها */
export function ZoomIcon({ size = 15, out = false }: IconProps & { out?: boolean }) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="M15.4 15.4l4.4 4.4" />
      <path d="M7.6 10.6h6" />
      {!out && <path d="M10.6 7.6v6" />}
    </svg>
  )
}

/**
 * سهمٌ نحو جهة — التنقّل في منتقيات التاريخ. مرسومٌ لا حرفَ قوسٍ، فيُعرف
 * اتجاهُه بالنظر. و«السابق» في العربية عن اليمين، فهو الاتجاه الأصل.
 */
export function ArrowIcon(
  { size = 15, dir = 'right', style }: IconProps & { dir?: 'right' | 'left'; style?: CSSProperties },
) {
  return (
    <svg
      {...strokeIcon(size)}
      style={{ ...style, transform: dir === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M14.4 6.4L20 12l-5.6 5.6" />
      <path d="M19.2 12H4.4" />
    </svg>
  )
}

/** زر الرجوع بسهمٍ مرسوم بحدود CSS */
export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none', background: 'none', fontSize: 14, color: 'var(--accent)',
        marginBottom: 20, padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <span style={{
        display: 'inline-block', width: 7, height: 7,
        borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)',
        transform: 'rotate(-135deg)',
      }} />
      {label}
    </button>
  )
}

/**
 * غلافٌ لطبقةٍ معتمة: النقر خارج البطاقة يُغلق، وداخلها لا يُغلق.
 *
 * وموضعُها من `document.body` لا من شجرة الصفحة (`createPortal`)، كورقة
 * الطباعة سواءً بسواء. و`#root` مكبَّرٌ بـ`zoom`، والتكبيرُ يُنشئ سياقًا
 * جديدًا يتعلّق به الثابتُ (`position: fixed`) في بعض المتصفّحات، فلا يبلغ
 * أطرافَ الشاشة وتبقى من الظلّ حواشٍ مكشوفة عن يمينه وعن شماله. وموضعُها
 * من `body` يقطع ذلك كلَّه: لا تكبيرَ فوقها ولا قصَّ ولا سياق.
 *
 * ويبقى تكبيرُ القارئ ساريًا على جوف النافذة وحده (`.overlay-sheet`)، فلا
 * يفوته ما اختاره لنفسه من حجم الخطّ.
 */
export function Overlay(
  { onClose, children, align = 'center', zIndex = 90, paddingTop }:
  { onClose: () => void; children: ReactNode; align?: 'center' | 'flex-start'; zIndex?: number; paddingTop?: number },
) {
  return createPortal(
    <div
      onClick={onClose}
      className="overlay-wrap"
      style={{ zIndex, alignItems: align, paddingTop }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'contents' }}>{children}</div>
    </div>,
    document.body,
  )
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      title="إغلاق"
      aria-label="إغلاق"
      style={{
        border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)',
        width: 30, height: 30, borderRadius: '50%', fontSize: 16, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      }}
    >
      ×
    </button>
  )
}

/**
 * زرٌّ ينسخ نصًّا، ويُعلِن تمامَ النسخ بصحٍّ يظهر لحظةً ثم ينصرف.
 *
 * وهو مشتركٌ بين بطاقة الكتاب وبطاقة القيد: كلتاهما تُنسخ إحالتُها ورابطُها،
 * فلا يُكتب الزرُّ مرَّتين ويفترق سلوكُه بينهما.
 */
export function CopyButton(
  { icon, label, done, value, onFail, className = 'card-action' }:
  {
    icon: ReactNode
    label: string
    done: string
    value: string
    onFail: (message: string) => void
    className?: string
  },
) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // بعض المتصفّحات تمنع الحافظة خارج الاتصال الآمن، فيُقال ذلك صراحةً
      onFail('تعذّر النسخ إلى الحافظة، فانسخه بيدك: ' + value)
    }
  }

  return (
    <button type="button" className={className} onClick={() => void copy()} title={label}>
      {copied ? <CheckIcon size={15} /> : icon}
      <span>{copied ? done : label}</span>
    </button>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="section-heading" style={{
      fontFamily: 'var(--heading-font)', fontSize: 16, fontWeight: 700,
      color: 'var(--accent-soft)', marginTop: 8,
    }}>
      {children}
    </div>
  )
}

/**
 * حقلٌ نصّي يحفظ بعد سكوت الكاتب لا مع كل حرف. يبقى ما يُكتب ظاهرًا فورًا،
 * ولا يُستبدَل بقيمة الخادم ما دام المؤشر داخل الحقل.
 */
function useDebouncedField(value: string, onCommit: (v: string) => void, delay: number) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commit = useRef(onCommit)
  commit.current = onCommit

  useEffect(() => { if (!focused.current) setDraft(value) }, [value])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const onChange = (next: string) => {
    setDraft(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => commit.current(next), delay)
  }

  const onBlur = () => {
    focused.current = false
    if (timer.current) clearTimeout(timer.current)
    if (draft !== value) commit.current(draft)
  }

  return { draft, onChange, onBlur, onFocus: () => { focused.current = true } }
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onCommit: (value: string) => void
  delay?: number
}

export function DebouncedInput({ value, onCommit, delay = 600, ...rest }: InputProps) {
  const f = useDebouncedField(value, onCommit, delay)
  return (
    <input
      {...rest}
      value={f.draft}
      onChange={(e) => f.onChange(e.target.value)}
      onFocus={f.onFocus}
      onBlur={f.onBlur}
    />
  )
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onCommit: (value: string) => void
  delay?: number
}

export function DebouncedTextarea({ value, onCommit, delay = 700, ...rest }: TextareaProps) {
  const f = useDebouncedField(value, onCommit, delay)
  return (
    <textarea
      {...rest}
      value={f.draft}
      onChange={(e) => f.onChange(e.target.value)}
      onFocus={f.onFocus}
      onBlur={f.onBlur}
    />
  )
}

/**
 * حقلُ «اكتب جديدًا أو اختر من المكتبة». كان `datalist`، وكان يَكِلُ الترشيح
 * إلى المتصفّح فيختلف من متصفّحٍ إلى آخر ولا يُطابق العربية إلا بحرفها
 * كما كُتب. وهذا يُرشِّح بنفسه بمعيار البحث في المكتبة نفسه — بلا تشكيلٍ
 * ولا تفريقٍ بين الهمزات — ويُبقي الكتابة الحرّة على حالها.
 */
export function Combobox(
  { value, onChange, options, placeholder, disabled, style, emptyHint }: {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder?: string
    disabled?: boolean
    style?: CSSProperties
    /** ما يُقال حين لا مطابق: «اسمٌ جديد، سيُنشأ له سجلّ» ونحوه */
    emptyHint?: string
  },
) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current) }, [])

  const matches = useMemo(() => {
    const needle = normalizeText(value, QUICK_OPTS)
    const seen = options.filter((o) => o.trim())
    if (!needle) return seen.slice(0, 40)
    // ما ابتدأ بالمكتوب أولى مما تضمّنه، فالمقصود غالبًا أوّلُ الاسم
    const starts = seen.filter((o) => normalizeText(o, QUICK_OPTS).startsWith(needle))
    const has = seen.filter((o) => {
      const n = normalizeText(o, QUICK_OPTS)
      return !n.startsWith(needle) && n.includes(needle)
    })
    return [...starts, ...has].slice(0, 40)
  }, [options, value])

  const exact = options.some(
    (o) => normalizeText(o, QUICK_OPTS) === normalizeText(value, QUICK_OPTS),
  )
  const showList = open && matches.length > 0

  function pick(option: string) {
    onChange(option)
    setOpen(false)
  }

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        // الإغلاق يتأخّر لحظةً كي يسبقه نقرُ الخيار، فالنقر يُفقِد التركيز أولًا
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 130) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); return }
          if (!showList) { if (e.key === 'ArrowDown') setOpen(true); return }
          if (e.key === 'ArrowDown') {
            e.preventDefault(); setActive((i) => (i + 1) % matches.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length)
          } else if (e.key === 'Enter') {
            e.preventDefault(); pick(matches[active] ?? value)
          }
        }}
        style={{ ...inputStyle, ...style }}
      />

      {showList && (
        <ul
          className="thin-scroll"
          role="listbox"
          style={{
            position: 'absolute', insetInline: 0, top: 'calc(100% + 4px)', zIndex: 40,
            margin: 0, padding: 4, listStyle: 'none', maxHeight: 220, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 9, boxShadow: '0 12px 28px oklch(0.24 0.02 50 / 0.18)',
          }}
        >
          {matches.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(option)}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '7px 10px', borderRadius: 6, fontSize: 13.5, cursor: 'pointer',
                background: i === active ? 'var(--header)' : 'none',
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}

      {emptyHint && value.trim() && !exact && (
        <span style={{ display: 'block', fontSize: 11, color: 'var(--accent-soft)', marginTop: 5 }}>
          {emptyHint}
        </span>
      )}
    </span>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="empty-state"
      style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}
    >
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 20, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 14 }}>{hint}</div>}
    </div>
  )
}
