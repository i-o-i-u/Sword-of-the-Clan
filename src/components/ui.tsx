// القطع الصغيرة المشتركة وأنماطها. القيم مأخوذة من رموز التصميم كما هي (§٩).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { starsText } from '../lib/types'

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
      <span>{amount}</span>
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
    'تم القراءة': { color: 'oklch(0.36 0.09 150)', background: 'oklch(0.93 0.04 150)' },
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

/** ساعةٌ صغيرة — بجانب توقيت مكة */
export function ClockIcon({ size = 14 }: IconProps) {
  return (
    <svg {...strokeIcon(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.4 2" />
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

/** غلافٌ لطبقةٍ معتمة: النقر خارج البطاقة يُغلق، وداخلها لا يُغلق */
export function Overlay(
  { onClose, children, align = 'center', zIndex = 90, paddingTop }:
  { onClose: () => void; children: ReactNode; align?: 'center' | 'flex-start'; zIndex?: number; paddingTop?: number },
) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'oklch(0.15 0.01 50 / 0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: align, justifyContent: 'center',
        padding: 20, paddingTop,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'contents' }}>{children}</div>
    </div>
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

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{
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

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 20, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 14 }}>{hint}</div>}
    </div>
  )
}
