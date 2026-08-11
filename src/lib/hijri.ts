// التقاويم والتواريخ (§٧).
// القاعدة الثابتة في هذا المشروع: ما قبل الهجرة والميلاد يُكتب موجبًا
// («١٢٢ ق.هـ» لا «−١٢٢»)، ويُخزَّن العدد موجبًا ومعه التقويم.
// والسالب لا يظهر إلا في الحساب الداخلي للترتيب.

import type { Author, Era } from './types'

export const HIJRI_MONTHS = [
  'محرّم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجة',
]

export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const HIJRI_FMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
})

/** يوحّد كل التقاويم إلى رقمٍ هجريّ للمقارنة والترتيب فقط */
export function toHijriYear(year: number | null | undefined, era: Era | string | undefined): number | null {
  if (year === null || year === undefined || !Number.isFinite(Number(year))) return null
  const y = Math.abs(Number(year))
  if (era === 'ق.هـ') return -y
  if (era === 'ق.م') return Math.round((-y - 622) * 1.030684)
  if (era === 'م') return Math.round((y - 622) * 1.030684)
  return y
}

/** «٧٣٢ – ٨٠٨ هـ» / «ت ٨٠٨ هـ» / «وُلد ١٩٤٧ م» / «تاريخٌ غير مسجَّل» */
export function lifeLabel(a: Pick<Author, 'birth' | 'death' | 'era'> | null | undefined): string {
  if (!a) return ''
  const e = a.era || 'هـ'
  if (a.birth != null && a.death != null) return `${a.birth} – ${a.death} ${e}`
  if (a.death != null) return `ت ${a.death} ${e}`
  if (a.birth != null) return `وُلد ${a.birth} ${e}`
  return 'تاريخٌ غير مسجَّل'
}

/** «١٤٤٧ هـ» — سنة النشر مع تقويمها */
export function yearLabel(year: number | null | undefined, era: Era | string | undefined): string {
  if (year === null || year === undefined) return '—'
  return `${year} ${era || 'م'}`
}

/** «١٢ رجب ١٤٤٧ هـ» — تاريخ الاقتناء */
export function hijriLabel(
  day: number | null | undefined,
  month: number | null | undefined,
  year: number | null | undefined,
): string {
  if (!day || !month || !year) return ''
  return `${day} ${HIJRI_MONTHS[month - 1] ?? ''} ${year} هـ`
}

export interface HijriParts { y: number; m: number; d: number }

export function hijriParts(date: Date): HijriParts {
  const p: Record<string, string> = {}
  HIJRI_FMT.formatToParts(date).forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value })
  return { y: parseInt(p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) }
}

export function hijriToday(): HijriParts {
  return hijriParts(new Date())
}

/**
 * أول يوم ميلاديّ لشهرٍ هجريّ: نُقدِّره بالمتوسط ثم نمشي يومًا يومًا
 * حتى تتطابق أجزاء أم القرى.
 */
function gregorianForHijri(y: number, m: number): Date {
  const est = Date.UTC(622, 6, 16) + Math.round((y - 1) * 354.36707 + (m - 1) * 29.530589) * 86400000
  let date = new Date(est)
  for (let i = 0; i < 90; i++) {
    const p = hijriParts(date)
    if (p.y === y && p.m === m && p.d === 1) return date
    const diff = (p.y - y) * 12 + (p.m - m)
    date = new Date(date.getTime() + (diff > 0 || (diff === 0 && p.d > 1) ? -86400000 : 86400000))
  }
  return date
}

/** أيام شهرٍ هجريّ مع أيام الأسبوع، لبناء شبكة التقويم */
export function hijriMonthDays(y: number, m: number): { d: number; weekday: number }[] {
  const days: { d: number; weekday: number }[] = []
  let cur = gregorianForHijri(y, m)
  for (let i = 0; i < 31; i++) {
    const p = hijriParts(cur)
    if (p.m !== m || p.y !== y) break
    days.push({ d: p.d, weekday: cur.getUTCDay() })
    cur = new Date(cur.getTime() + 86400000)
  }
  return days
}
