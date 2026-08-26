// قراءةُ القيود: ما يُشتقّ منها من أبوابٍ وأعلامٍ وكرّاساتٍ ووسوم، وترشيحُها
// وترتيبُها.
//
// وكلُّ ذلك يُشتقّ من القيود أنفسها لا من جداولَ تُدار: الكرّاسةُ اسمٌ يُكتب
// في القيد فتقوم به، والعَلَمُ اسمٌ يُذكر فيه فيُجمع به ما تفرَّق عنه — كما
// تُشتقّ دواليبُ صفحة التصفُّح والسلاسلُ من الكتب.

import { QUICK_OPTS, normalizeText } from './search'
import { HIJRI_MONTHS, hijriParts, toArabicDigits } from './hijri'
import type { Book, Perk, PerkKind } from './types'

// ---------------------------------------------------------------------------
// ما يُشتقّ من القيود
// ---------------------------------------------------------------------------

/** اسمٌ وعددُ ما تحته، وهو صورةُ كلِّ ما يُشتقّ من القيود */
export interface Tally {
  name: string
  count: number
  /** فروعُه، إن كان بابًا رئيسًا */
  children?: Tally[]
}

/** يعدّ أسماءً بلا تكرار، ويرتّبها بالأكثر ثم أبجديًّا */
function tally(values: Iterable<string>): Tally[] {
  const map = new Map<string, number>()
  for (const raw of values) {
    const name = raw.trim()
    if (!name) continue
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
}

/**
 * أبوابُ القيود: الرئيسُ ومعه فروعُه. والقيدُ بلا بابٍ لا يُعدّ في شيء —
 * الفراغ خيارٌ قائم، فلا يُلزَم المُقيِّد بما لم يستبن له بعد.
 */
export function perkTopics(perks: Perk[]): Tally[] {
  const mains = new Map<string, { count: number; subs: Map<string, number> }>()
  for (const p of perks) {
    const main = p.category.trim()
    if (!main) continue
    if (!mains.has(main)) mains.set(main, { count: 0, subs: new Map() })
    const entry = mains.get(main)!
    entry.count += 1
    const sub = p.sub_category.trim()
    if (sub) entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1)
  }
  return [...mains.entries()]
    .map(([name, { count, subs }]) => ({
      name,
      count,
      children: [...subs.entries()]
        .map(([sub, n]) => ({ name: sub, count: n }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar')),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
}

/** الأعلامُ المذكورون في القيود */
export function perkPeople(perks: Perk[]): Tally[] {
  return tally(perks.flatMap((p) => p.people))
}

/** الكرّاسات: مسائلُ جُمع لها المتفرِّق من القيود */
export function perkNotebooks(perks: Perk[]): Tally[] {
  return tally(perks.map((p) => p.notebook))
}

/** الوسوم */
export function perkTags(perks: Perk[]): Tally[] {
  return tally(perks.flatMap((p) => p.tags))
}

/** الكتبُ التي أفادت: ما قُيِّد منه شيء، من الفهرس كان أو من خارجه */
export function perkSources(perks: Perk[], bookById: (id: string) => Book | undefined): Tally[] {
  return tally(perks.map((p) => sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined)))
}

/** عنوانُ مصدر القيد: من الفهرس إن كان فيه، وإلّا فما كُتب نصًّا */
export function sourceTitle(perk: Perk, book: Book | undefined): string {
  return book?.title.trim() || perk.source?.title.trim() || ''
}

/** ومؤلِّفُه كذلك */
export function sourceAuthor(perk: Perk, book: Book | undefined): string {
  return book?.author_name.trim() || perk.source?.author.trim() || ''
}

// ---------------------------------------------------------------------------
// الترشيح
// ---------------------------------------------------------------------------

/** ما يُصفَّى به السيل. الفراغُ في كلِّ حقلٍ معناه: لا ترشيحَ به. */
export interface PerkFilter {
  query: string
  kind: PerkKind | ''
  category: string
  subCategory: string
  person: string
  notebook: string
  tag: string
  bookId: string
  /** أقلُّ نفاسةٍ تُقبل */
  minRating: number
}

export const EMPTY_FILTER: PerkFilter = {
  query: '', kind: '', category: '', subCategory: '',
  person: '', notebook: '', tag: '', bookId: '', minRating: 0,
}

/** أفي هذا الترشيح شرطٌ قائم؟ فإن لم يكن فالسيلُ كلُّه معروض */
export function filterIsOn(f: PerkFilter): boolean {
  return !!(f.query.trim() || f.kind || f.category || f.subCategory
    || f.person || f.notebook || f.tag || f.bookId || f.minRating)
}

/**
 * البحثُ يشمل عنوان القيد ونصَّه وتعليقَه ووسومَه وأعلامَه وكرّاستَه، ثم
 * عنوانَ مصدره ومؤلِّفَه — بمعيار البحث في المكتبة نفسه: بلا تشكيلٍ ولا
 * تفريقٍ بين الهمزات.
 */
function haystack(perk: Perk, book: Book | undefined): string {
  return [
    perk.title, perk.text, perk.comment, perk.notebook,
    perk.tags.join(' '), perk.people.join(' '),
    sourceTitle(perk, book), sourceAuthor(perk, book),
    perk.source?.edition ?? '',
  ].join(' ')
}

export function filterPerks(
  perks: Perk[], f: PerkFilter, bookById: (id: string) => Book | undefined,
): Perk[] {
  const needle = normalizeText(f.query.trim(), QUICK_OPTS)
  return perks.filter((p) => {
    if (f.kind && p.kind !== f.kind) return false
    if (f.category && p.category !== f.category) return false
    if (f.subCategory && p.sub_category !== f.subCategory) return false
    if (f.person && !p.people.includes(f.person)) return false
    if (f.notebook && p.notebook !== f.notebook) return false
    if (f.tag && !p.tags.includes(f.tag)) return false
    if (f.bookId && p.book_id !== f.bookId) return false
    if (f.minRating && p.rating < f.minRating) return false
    if (!needle) return true
    const book = p.book_id ? bookById(p.book_id) : undefined
    return normalizeText(haystack(p, book), QUICK_OPTS).includes(needle)
  })
}

// ---------------------------------------------------------------------------
// الترتيب
// ---------------------------------------------------------------------------

export type PerkSort = 'newest' | 'oldest' | 'precious' | 'longest' | 'title' | 'book' | 'topic'

export const PERK_SORTS: { key: PerkSort; label: string }[] = [
  { key: 'newest', label: 'الأحدث تقييدًا' },
  { key: 'oldest', label: 'الأقدم تقييدًا' },
  { key: 'precious', label: 'الأنفس' },
  { key: 'longest', label: 'الأطول' },
  { key: 'title', label: 'بالعنوان' },
  { key: 'book', label: 'بالكتاب' },
  { key: 'topic', label: 'بالباب' },
]

export function sortPerks(
  perks: Perk[], sort: PerkSort, bookById: (id: string) => Book | undefined,
): Perk[] {
  const list = [...perks]
  const at = (p: Perk) => new Date(p.created_at).getTime() || 0
  switch (sort) {
    case 'oldest': return list.sort((a, b) => at(a) - at(b))
    case 'precious': return list.sort((a, b) => b.rating - a.rating || at(b) - at(a))
    case 'longest': return list.sort((a, b) => b.text.length - a.text.length)
    case 'title': return list.sort((a, b) => a.title.localeCompare(b.title, 'ar'))
    case 'book':
      return list.sort((a, b) => sourceTitle(a, a.book_id ? bookById(a.book_id) : undefined)
        .localeCompare(sourceTitle(b, b.book_id ? bookById(b.book_id) : undefined), 'ar'))
    case 'topic':
      return list.sort((a, b) => a.category.localeCompare(b.category, 'ar')
        || a.sub_category.localeCompare(b.sub_category, 'ar'))
    default: return list.sort((a, b) => at(b) - at(a))
  }
}

// ---------------------------------------------------------------------------
// العرض
// ---------------------------------------------------------------------------

/** تاريخُ تقييد القيد هجريًّا: «١٣ ربيع الأول ١٤٤٨ هـ» */
export function perkDate(perk: Perk): string {
  const time = new Date(perk.created_at).getTime()
  if (!Number.isFinite(time)) return ''
  const { y, m, d } = hijriParts(new Date(time))
  return `${toArabicDigits(d)} ${HIJRI_MONTHS[m - 1] ?? ''} ${toArabicDigits(y)} هـ`
}

/**
 * أقصرُ بادئةٍ من معرّف القيد لا يشاركه فيها قيدٌ آخر — كما في الكتب. رابطُ
 * القيد يُنسخ ويُرسَل، ومعرّفات Convex لا تُملى.
 */
export function shortPerkId(id: string, ids: string[]): string {
  for (let n = 6; n < id.length; n++) {
    const head = id.slice(0, n)
    if (!ids.some((other) => other !== id && other.startsWith(head))) return head
  }
  return id
}

export function perkLink(id: string, ids: string[]): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/perk/${shortPerkId(id, ids)}`
}
