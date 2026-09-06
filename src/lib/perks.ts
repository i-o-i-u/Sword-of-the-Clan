// قراءةُ الفوائد: ما تُجمع به من تصنيفاتٍ وأعلامٍ وكرّاساتٍ ووسوم، وترشيحُها
// وترتيبُها.
//
// ومنه ما هو جدولٌ يُدار — التصنيفاتُ والأعلامُ والكرّاسات، لأن لكلٍّ منها
// ما لا تحمله الفائدة: أيقونةٌ، ووفاةٌ، ومسألةٌ تُفتح قبل أن تمتلئ — ومنه ما
// يُشتقّ من الفوائد أنفسها كالوسوم والكتب المُفيدة، كما تُشتقّ دواليبُ صفحة
// التصفُّح والسلاسلُ من الكتب.

import { QUICK_OPTS, normalizeText } from './search'
import { HIJRI_MONTHS, hijriParts, toArabicDigits } from './hijri'
import { FIGURE_ICON, sourceKindOf } from './types'
import type {
  Book, Notebook, Perk, PerkCategory, PerkFigure, PerkKind,
} from './types'

// ---------------------------------------------------------------------------
// ما يُشتقّ من القيود
// ---------------------------------------------------------------------------

/** اسمٌ وعددُ ما تحته، وهو صورةُ كلِّ ما يُشتقّ من القيود */
export interface Tally {
  name: string
  count: number
  /** معرّفُه، إن كان صفًّا في جدولٍ يُقصَد بعينه ككرّاسة */
  id?: string
  /** أيقونتُه من مكتبة الأيقونات، إن اختِيرت له */
  icon?: string
  /**
   * خبرٌ تحت اسمه: وفاةُ العَلَم، أو جنسُ المصدر. وهو ما لا تحمله الفائدةُ
   * نفسها وإنما يُقرأ من جدوله — وله جُعلت هذه الجداولُ تُدار.
   */
  note?: string
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
 * تصنيفاتُ الفوائد: الرئيسُ ومعه فروعُه، ومعه أيقونتُه إن اختِيرت.
 *
 * والفائدةُ تتبع أكثرَ من تصنيف، فتُعدّ في كلٍّ منها — وليس في ذلك تكرارٌ
 * مُفسِد: العددُ ههنا عددُ ما تحت البابِ لا قسمةُ الفوائد على الأبواب.
 * والفائدةُ بلا تصنيفٍ لا تُعدّ في شيء: الفراغ خيارٌ قائم، فلا يُلزَم
 * المُقيِّد بما لم يستبن له بعد.
 *
 * والفرعُ يُنسب إلى رئيسه من جدول التصنيفات لا من الفائدة: الفائدةُ تحمل
 * أسماءَ فروعها، ومَن رئيسُ كلِّ فرعٍ فذاك في الجدول.
 */
export function perkTopics(perks: Perk[], cats: PerkCategory[]): Tally[] {
  const parentOf = new Map(cats.map((c) => [c.name, c.parent]))
  const iconOf = new Map(cats.map((c) => [c.name, c.icon]))
  const mains = new Map<string, { count: number; subs: Map<string, number> }>()

  const ensure = (name: string) => {
    if (!mains.has(name)) mains.set(name, { count: 0, subs: new Map() })
    return mains.get(name)!
  }

  // التصنيفاتُ تُعرض كلُّها وإن لم تُنسَب إليها فائدةٌ بعد: هي جدولٌ يُدار لا
  // شيءٌ يُشتقّ من الفوائد، فبابٌ فارغٌ خبرٌ — يُعرف أنّ الموضع قائمٌ ينتظر
  for (const c of cats) {
    if (c.parent) ensure(c.parent).subs.set(c.name, 0)
    else ensure(c.name)
  }

  for (const p of perks) {
    for (const name of new Set(p.categories.map((c) => c.trim()).filter(Boolean))) {
      ensure(name).count += 1
    }
    for (const sub of new Set(p.sub_categories.map((c) => c.trim()).filter(Boolean))) {
      // فرعٌ لا رئيسَ له في الجدول يُعدّ بابًا بنفسه، فلا تسقط فائدةٌ لأن
      // رئيسَ فرعها حُذف
      const main = parentOf.get(sub) || sub
      const entry = ensure(main)
      entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1)
    }
  }

  return [...mains.entries()]
    .map(([name, { count, subs }]) => ({
      name,
      count,
      icon: iconOf.get(name) ?? '',
      children: [...subs.entries()]
        .map(([sub, n]) => ({ name: sub, count: n, icon: iconOf.get(sub) ?? '' }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar')),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
}

/**
 * الأعلامُ المذكورون في الفوائد، **من جدولهم لا من الفوائد وحدها**.
 *
 * وكانت تُقرأ من `p.people` مجرَّدةً، فيسقط بذلك جدولُ `perk_figures` كلُّه:
 * **وفاةُ العَلَم تُكتب في نافذة الإعدادات ثم لا تُعرض في موضعٍ واحد**، وهي
 * أخصُّ ما يُعرَّف به الرجل. ويسقط معها العَلَمُ المُسجَّل الذي لم تُنسَب إليه
 * فائدةٌ بعد — على خلاف أخوَيه: التصنيفُ الفارغ يُعرض («بابٌ فارغٌ خبر»)،
 * والكرّاسةُ الخالية تُعرض («خالية بعدُ»)، فلا وجهَ لأن ينفرد بابُ الأعلام
 * بأن يتبع الفوائدَ وهو جدولٌ يُدار مثلهما.
 *
 * ومن ذُكر في فائدةٍ وليس في الجدول يبقى معروضًا: لا تسقط فائدةٌ لأنّ اسمًا
 * لم يُسجَّل بعد — كما تصنع `perkKindsOf` بالنوع المرفوع.
 */
export function perkPeople(perks: Perk[], figures: PerkFigure[] = []): Tally[] {
  const counts = new Map(tally(perks.flatMap((p) => p.people)).map((t) => [t.name, t.count]))
  const rows: Tally[] = figures.map((f) => ({
    name: f.name,
    count: counts.get(f.name) ?? 0,
    icon: f.icon || FIGURE_ICON,
    note: f.death.trim(),
  }))

  const known = new Set(rows.map((r) => r.name))
  for (const [name, count] of counts) {
    if (!known.has(name)) rows.push({ name, count, icon: FIGURE_ICON })
  }

  return rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
}

/**
 * الكرّاسات وما اجتمع في كلٍّ منها. وهي جدولٌ قائم لا تُشتقّ من الفوائد:
 * الكرّاسةُ تُفتح ثم تُجمع إليها، فقد تقوم وهي بعدُ خالية — ولو اشتُقّت من
 * الفوائد لما ظهرت حتى تمتلئ.
 */
export function notebookTallies(notebooks: Notebook[], perks: Perk[]): Tally[] {
  return notebooks.map((n) => ({
    name: n.name,
    id: n.id,
    icon: n.icon,
    count: perks.filter((p) => p.notebook_ids.includes(n.id)).length,
  }))
}

/** الوسوم */
export function perkTags(perks: Perk[]): Tally[] {
  return tally(perks.flatMap((p) => p.tags))
}

/**
 * ما أفاد: كلُّ مصدرٍ قُيِّد منه شيء — من كتب الفهرس، أو مما قُرئ أو سُمع من
 * خارجها. وهو بابٌ كسائر الأبواب: صدرُ القسم يعدّ المصادرَ ولم يكن يدلّ
 * عليها، ولم يكن في `PerkFilter` ما يُطلب به مصدرٌ بعينه — كان فيه `bookId`
 * ميّتًا لا يضعه شيء.
 *
 * ولكلِّ مصدرٍ أيقونةُ جنسه وخبرُه: من الفهرس فكتابٌ ساكت، ومن خارجه فله
 * شارتُه — «سماعًا»، «من الشبكة» — فيُعرف بابُ الفائدة بالنظر.
 */
export function perkSources(perks: Perk[], bookById: (id: string) => Book | undefined): Tally[] {
  const rows = new Map<string, Tally>()
  for (const perk of perks) {
    const book = perk.book_id ? bookById(perk.book_id) : undefined
    const name = sourceTitle(perk, book)
    if (!name) continue

    const found = rows.get(name)
    if (found) { found.count += 1; continue }

    const kind = book ? undefined : sourceKindOf(perk.source?.kind)
    rows.set(name, {
      name,
      count: 1,
      icon: kind ? kind.icon : 'open-book',
      note: kind ? kind.badge : '',
    })
  }
  return [...rows.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
}

/**
 * اسمُ مصدر الفائدة: عنوانُ الكتاب من الفهرس إن كان فيه، وإلّا فما كُتب نصًّا.
 *
 * **ويُرجَع إلى صاحبه إذا لم يكن له عنوان**: ما سُمع في مجلسٍ قد لا عنوانَ
 * له، وإنما يُعرف بمن سُمع منه — فلو لزمناه العنوانَ لسقط عزوُ الفائدة كلُّه
 * من بطاقتها ومن باب المصادر، وهي معزوَّةٌ إلى رجلٍ معلوم.
 */
export function sourceTitle(perk: Perk, book: Book | undefined): string {
  const title = book?.title.trim() || perk.source?.title.trim() || ''
  if (title) return title
  return perk.source?.author.trim() || perk.source?.venue.trim() || ''
}

/** ومؤلِّفُه كذلك — أو من سُمع منه، أو صاحبُ المنشور */
export function sourceAuthor(perk: Perk, book: Book | undefined): string {
  const writer = book?.author_name.trim() || perk.source?.author.trim() || ''
  // ولا يُعاد الاسمُ مرَّتين: إن كان هو نفسَه عنوانَ المصدر فقد ذُكر
  return writer && writer === sourceTitle(perk, book) ? '' : writer
}

// ---------------------------------------------------------------------------
// الترشيح
// ---------------------------------------------------------------------------

/** ما تُصفَّى به الفوائد. الفراغُ في كلِّ حقلٍ معناه: لا ترشيحَ به. */
export interface PerkFilter {
  query: string
  kind: PerkKind | ''
  category: string
  subCategory: string
  person: string
  /** معرّفُ الكرّاسة لا اسمُها: الاسمُ يُعدَّل والمعرّفُ لا يتبدّل */
  notebook: string
  tag: string
  /** اسمُ المصدر كما يُعرض: عنوانُ الكتاب، أو من سُمع منه */
  source: string
  /** أقلُّ نفاسةٍ تُقبل */
  minRating: number
}

export const EMPTY_FILTER: PerkFilter = {
  query: '', kind: '', category: '', subCategory: '',
  person: '', notebook: '', tag: '', source: '', minRating: 0,
}

/**
 * ما يُقصَد قصدًا من بابٍ أو رُقعة، فيُوضع في الرابط ويُشارَك. وما سواه —
 * البحثُ والنفاسةُ والترتيب — حالُ القارئ في لحظته لا موضعٌ يُعاد إليه.
 */
export type PickField =
  | 'kind' | 'category' | 'subCategory' | 'person' | 'notebook' | 'tag' | 'source'

export const PICK_FIELDS: PickField[] = [
  'kind', 'category', 'subCategory', 'person', 'notebook', 'tag', 'source',
]

export function isPickField(name: string): name is PickField {
  return (PICK_FIELDS as string[]).includes(name)
}

/** نعتُ كلِّ حقلٍ في شارته: «العَلَم: ابن تيمية» */
export const PICK_LABELS: Record<PickField, string> = {
  kind: 'النوع',
  category: 'التصنيف',
  subCategory: 'الفرع',
  person: 'العَلَم',
  notebook: 'الكرّاسة',
  tag: 'الوسم',
  source: 'المصدر',
}

/** أفي هذا الترشيح شرطٌ قائم؟ فإن لم يكن فالفوائدُ كلُّها معروضة */
export function filterIsOn(f: PerkFilter): boolean {
  return !!(f.query.trim() || f.minRating || PICK_FIELDS.some((k) => f[k]))
}

/** شارةُ ترشيحٍ قائم: نعتُه، وما رُشِّح به، وحقلُه ليُرفع وحدَه */
export interface FilterChip {
  field: keyof PerkFilter
  label: string
  value: string
}

/**
 * الترشيحُ القائم مقروءًا، شارةً لكلّ شرط.
 *
 * **وهو ما كان ينقص الباب**: يُضغط اسمُ العَلَم في «الأعلام» أو فرعُ التصنيف
 * في «التصنيفات» فيُنقَل القارئُ إلى «الفوائد» مُرشَّحًا، وليس في الشريط ما
 * يدلّ على العَلَم ولا على الفرع ولا على الكرّاسة — فيقف على قائمةٍ نقصت
 * ولا يدري بأيّ شيءٍ نقصت ولا كيف يردّ الناقص. وأمّا النوعُ والتصنيفُ
 * الرئيس والوسمُ فلها رُقَعُها ومنتقياتُها، فتُرى.
 */
export function activeFilters(f: PerkFilter, notebooks: Notebook[]): FilterChip[] {
  const chips: FilterChip[] = []
  const push = (field: keyof PerkFilter, value: string) => {
    if (value) chips.push({ field, label: PICK_LABELS[field as PickField], value })
  }

  if (f.query.trim()) chips.push({ field: 'query', label: 'البحث', value: f.query.trim() })
  for (const field of PICK_FIELDS) {
    // والكرّاسةُ تُحفظ بمعرّفها لا باسمها، فيُقرأ اسمُها من جدولها
    if (field === 'notebook') {
      const found = notebooks.find((n) => n.id === f.notebook)
      push('notebook', found?.name ?? (f.notebook ? '—' : ''))
    } else push(field, f[field])
  }
  if (f.minRating > 0) {
    chips.push({
      field: 'minRating',
      label: 'النفاسة',
      value: f.minRating >= 3 ? '★★★ النفائس' : `${'★'.repeat(f.minRating)} فما فوق`,
    })
  }
  return chips
}

/**
 * البحثُ يشمل عنوان الفائدة ونصَّها وتعليقَها وهوامشَها وأنواعَها وتصنيفاتِها
 * وأعلامَها ووسومَها، ثم عنوانَ مصدرها ومؤلِّفَه — بمعيار البحث في المكتبة
 * نفسه: بلا تشكيلٍ ولا تفريقٍ بين الهمزات. والنصُّ المقروء هو المجرَّد لا
 * المنسَّق، فلا يُطابَق اسمُ وسمٍ في HTML ويُحسَب كلامَ المؤلِّف.
 */
function haystack(perk: Perk, book: Book | undefined): string {
  return [
    perk.title, perk.text, perk.comment,
    perk.kinds.join(' '), perk.categories.join(' '), perk.sub_categories.join(' '),
    perk.tags.join(' '), perk.people.join(' '),
    (perk.footnotes ?? []).map((f) => f.text).join(' '),
    sourceTitle(perk, book), sourceAuthor(perk, book),
    perk.source?.edition ?? '',
    // ومجلسُ السماع والموقعُ الذي نُشر فيه يُطلب بهما كما يُطلب بالطبعة
    perk.source?.venue ?? '',
  ].join(' ')
}

export function filterPerks(
  perks: Perk[], f: PerkFilter, bookById: (id: string) => Book | undefined,
): Perk[] {
  const needle = normalizeText(f.query.trim(), QUICK_OPTS)
  return perks.filter((p) => {
    if (f.kind && !p.kinds.includes(f.kind)) return false
    if (f.category && !p.categories.includes(f.category)) return false
    if (f.subCategory && !p.sub_categories.includes(f.subCategory)) return false
    if (f.person && !p.people.includes(f.person)) return false
    if (f.notebook && !p.notebook_ids.includes(f.notebook)) return false
    if (f.tag && !p.tags.includes(f.tag)) return false
    if (f.minRating && p.rating < f.minRating) return false
    if (!f.source && !needle) return true
    const book = p.book_id ? bookById(p.book_id) : undefined
    // والمصدرُ يُطابَق باسمه المعروض لا بمعرّفه: به تُجمع كتبُ الفهرس وما
    // قُرئ أو سُمع من خارجه في بابٍ واحد، وليس لِما خارجه معرّف
    if (f.source && sourceTitle(p, book) !== f.source) return false
    if (!needle) return true
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
      return list.sort((a, b) => (a.categories[0] ?? '').localeCompare(b.categories[0] ?? '', 'ar')
        || (a.sub_categories[0] ?? '').localeCompare(b.sub_categories[0] ?? '', 'ar'))
    default: return list.sort((a, b) => at(b) - at(a))
  }
}

// ---------------------------------------------------------------------------
// العرض
// ---------------------------------------------------------------------------

/** تاريخُ تقييد الفائدة هجريًّا: «١٣ ربيع الأول ١٤٤٨ هـ» */
export function perkDate(perk: Perk): string {
  const time = new Date(perk.created_at).getTime()
  if (!Number.isFinite(time)) return ''
  const { y, m, d } = hijriParts(new Date(time))
  return `${toArabicDigits(d)} ${HIJRI_MONTHS[m - 1] ?? ''} ${toArabicDigits(y)} هـ`
}

/**
 * أقصرُ بادئةٍ من معرّف الفائدة لا تشاركه فيها فائدةٌ أخرى — كما في الكتب.
 * ورابطُ الفائدة يُنسخ ويُرسَل، ومعرّفات Convex لا تُملى.
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
