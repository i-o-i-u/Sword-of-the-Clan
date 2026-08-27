// النشرة: دُورُها، وهيئتُها، وسنواتُ مجلَّداتها، وصلتُها بأخواتها.
//
// وهذه قراءةٌ من الكتب نفسها لا من جداول، كما تُقرأ الصفاتُ في `people.ts`
// والقيودُ في `perks.ts`. ومَرْجِعُ ألفاظها `types.ts` وحدَه.
//
// وأصلُ الباب أنّ الكتاب الواحد قد يُخرَج على وجوهٍ لا يُحصيها حقلٌ واحد:
// دارانِ تشتركان في غلافٍ واحد، ودارٌ تُخرج أوَّلَ مجلَّداته وأخرى تُتمّها
// بعد عشرين سنة، ونشرةٌ تُصوَّر عن نشرةٍ فلا تكون شيئًا جديدًا، وكتابٌ
// يُطبَع ضمن كتاب. وكلُّ ذلك خبرٌ عن نشرةٍ واحدة، لا عن كتبٍ متعدِّدة.

import { toArabicDigits, yearLabel } from './hijri'
import {
  ISSUE_KINDS, WITHIN_LABEL, WITH_LABEL,
  type Book, type CoPublisher, type WithinTitle,
} from './types'

/** دارٌ من دُور النشرة كما تُعرض: اسمُها، ونطاقُها منها، وسجلُّها إن كان */
export interface PressRef {
  name: string
  /** ما أخرجَته من الكتاب، والفراغُ: النشرةُ كلُّها */
  scope: string
  id: string | null
}

/**
 * دُورُ النشرة على ترتيبها: الأولى من `publisher`، ثم من شارَكها.
 * وما لا اسمَ له يسقط، فلا يُعرض في السطر فراغٌ معطوف.
 */
export function pressesOf(book: Book): PressRef[] {
  const first: PressRef = {
    name: (book.publisher ?? '').trim(),
    scope: (book.publisher_scope ?? '').trim(),
    id: book.publisher_id ?? null,
  }
  const rest: PressRef[] = (book.co_publishers ?? []).map((c: CoPublisher) => ({
    name: (c.name ?? '').trim(),
    scope: (c.scope ?? '').trim(),
    id: c.publisher_id ?? null,
  }))
  return [first, ...rest].filter((p) => p.name)
}

/**
 * دُورُ النشرة سطرًا واحدًا، كما يُكتب في جريدة المراجع.
 *
 * والعطفُ يتبع النطاق كما يتبعه في المشاركين: الشريكتان في النشرة كلِّها
 * تُعطف إحداهما على الأخرى بالواو — «دار ابن النفيس ودار التدوين العربي» —
 * وأمّا اللتان اقتسمتا مجلَّداتِه فليستا شريكتين في عملٍ واحد، بل لكلٍّ
 * عملُها، فيُفصل بينهما بفاصلةٍ تُبيِّن ولا تجمع.
 */
export function pressesLine(book: Book): string {
  const presses = pressesOf(book)
  if (presses.length === 0) return ''
  const split = presses.some((p) => p.scope)
  const parts = presses.map((p) => (p.scope ? `${p.name} (${toArabicDigits(p.scope)})` : p.name))
  return parts.join(split ? '، ' : ' و')
}

/**
 * خبرُ هيئة النشرة جملةً تامّة: «مصوَّرة — صوَّرتها دار كذا، ١٤٣٠ هـ».
 *
 * والأصلُ لا خبرَ له: هو الأصلُ عند الناس كلِّهم، فلا يُقال في بطاقة الكتاب
 * «أصل» كما لا يُقال «اللغة: العربية».
 */
const ISSUE_VERB: Record<string, string> = {
  'مصوَّرة': 'صوَّرتها',
  'إعادة صفّ': 'أعادت صفَّها',
}

export function issueLine(book: Book): string {
  const kind = (book.issue_kind ?? '').trim()
  if (!kind || !ISSUE_KINDS.includes(kind)) return ''

  const by = (book.issue_by ?? '').trim()
  const year = book.issue_year != null
    ? toArabicDigits(yearLabel(book.issue_year, book.year_era))
    : ''
  if (!by && !year) return kind

  const verb = ISSUE_VERB[kind] ?? ''
  const tail = [by && `${verb} ${by}`, year].filter(Boolean).join('، ')
  return `${kind} — ${tail}`
}

/** هل هذه النشرة مصوَّرةٌ أو إعادةُ صفّ؟ يُعلَّم بها الكتابُ في بطاقته */
export function issueBadge(book: Book): string {
  const kind = (book.issue_kind ?? '').trim()
  return ISSUE_KINDS.includes(kind) ? kind : ''
}

/**
 * سنواتُ صدور المجلَّدات مَدًى، حين تتفاوت: «١٤١٧ - ١٤٤٤ هـ».
 *
 * ويرجع فارغًا متى اتّفقت السنواتُ أو لم يُعرف منها إلا واحدة — فالمَدَى لا
 * يقوم بطرفٍ واحد، وسنةُ النشر في موضعها من البطاقة تكفيه.
 */
export function volumeYearSpan(book: Book): string {
  const years = (book.volume_years ?? []).filter((y) => y > 0)
  if (years.length < 2) return ''
  const min = Math.min(...years)
  const max = Math.max(...years)
  if (min === max) return ''
  return `${toArabicDigits(min)} - ${toArabicDigits(yearLabel(max, book.year_era))}`
}

// ------------------------------------------------------- النشرات الأخرى
/**
 * نشراتُ الكتاب الأخرى في المكتبة.
 *
 * والنسبةُ فيها إلى واحدة: تُختار الأجودُ أصلًا، وتُنسَب إليها ما دونها في
 * `edition_of`. فمن وقف على الدُّونى وجد سبيلَه إلى الأجود، ومن وقف على
 * الأجود رأى ما معها. ولا يُعدُّ في عناوين المكتبة إلا الأصل.
 */
export interface EditionGroup {
  /** النشرةُ الأجود التي هذه نشرةٌ أخرى منها، وفارغةٌ إن كانت هي الأجود */
  of: Book | null
  /** ما بقي من نشرات الكتاب في المكتبة، دون هذه ودون الأجود */
  others: Book[]
}

export function editionGroup(books: Book[], book: Book): EditionGroup {
  const of = book.edition_of ? books.find((b) => b.id === book.edition_of) ?? null : null
  const rootId = of?.id ?? book.id
  const others = books.filter(
    (b) => b.id !== book.id && b.id !== of?.id && b.edition_of === rootId,
  )
  return { of, others }
}

// -------------------------------------------------- ما طُبع معه أو فيه
/**
 * الكتبُ تُطبع مجتمعةً على وجهين، وبينهما فرقٌ في العين لا في اللفظ وحده:
 *
 *   • **مطبوعٌ معه**: للنشرة كتابٌ رئيسٌ هو المقصود بالطبع، ثم أُلحق به
 *     غيرُه تكملةً وتتميمًا. فالسجلُّ سجلُّ ذلك الرئيس، وبياناتُه بياناتُه.
 *   • **مطبوعٌ فيه**: العنوانُ اسمُ مجموعةٍ لا اسمُ كتاب — «برنامج مهمّات
 *     العلم» — طُبع فيها كتابُ التوحيد والأربعون النووية وغيرُهما. فليس
 *     للمجموعة مؤلِّفٌ وإنما مَن أشرف عليها، ولا تُعدّ هي كتابًا.
 *
 * وفي الوجهين جميعًا: العنوانُ المضموم كتابٌ يُعدّ في المكتبة، وليس له من
 * الورق شيءٌ على حِدَة — فلا مجلَّدَ له ولا صفحاتِ ولا موضعَ من الرفّ غيرُ
 * موضع ضامِّه. ولذلك لم يُجعل سجلًّا برأسه، بل خبرًا في ضامِّه.
 */

/** هل السجلُّ مجموعةٌ لا كتاب؟ */
export function isCollection(book: Book): boolean {
  return !!book.is_collection
}

/** ما ضمَّه الكتابُ من العناوين، وما لا عنوان له يسقط */
export function withinTitlesOf(book: Book): WithinTitle[] {
  return (book.within_titles ?? []).filter((t) => t.title.trim())
}

/** لفظُ الصلة، تابعًا لهيئة الضامّ: «مطبوعٌ معه» أو «مطبوعٌ فيه» */
export function withinLabelOf(book: Book): string {
  return isCollection(book) ? WITHIN_LABEL : WITH_LABEL
}

/**
 * وحدةُ العدّ في المكتبة: عنوانٌ قائمٌ بسجلّه، أو عنوانٌ مضمومٌ إلى سجلّ.
 *
 * وبها تُعَدّ الكتبُ والمؤلِّفون والتصنيفاتُ جميعًا، فلا يختلف رقمانِ في
 * صفحتين عن شيءٍ واحد.
 */
export interface CountedTitle {
  /** السجلُّ الذي يحمله: هو نفسُه إن كان قائمًا، أو ضامُّه إن كان مضمومًا */
  book: Book
  /** خبرُ العنوان المضموم، وفارغٌ للقائم بسجلّه */
  within: WithinTitle | null
  title: string
  author_id: string | null
  author_name: string
  category: string
  sub_category: string
  is_matn: boolean
}

/**
 * عناوينُ المكتبة كلُّها، ولا يُعدّ فيها:
 *   • نشرةٌ أخرى لكتابٍ عندنا — النشرتان عنوانٌ واحد لا عنوانان، وإن كان
 *     لكلٍّ محقِّقُها ودارُها ومجلَّداتُها.
 *   • مجموعةٌ طُبع فيها غيرُها — عنوانُها اسمُ المجموعة لا اسمُ كتاب،
 *     والمعدودُ ما طُبع فيها.
 */
export function countedTitles(books: Book[]): CountedTitle[] {
  const out: CountedTitle[] = []
  for (const book of books) {
    if (!book.edition_of && !isCollection(book)) {
      out.push({
        book,
        within: null,
        title: book.title,
        author_id: book.author_id,
        author_name: book.author_name,
        category: book.category,
        sub_category: book.sub_category ?? '',
        is_matn: book.is_matn,
      })
    }
    for (const t of withinTitlesOf(book)) {
      out.push({
        book,
        within: t,
        title: t.title,
        author_id: t.author_id ?? null,
        author_name: t.author_name,
        category: t.category ?? '',
        sub_category: t.sub_category ?? '',
        is_matn: t.is_matn ?? false,
      })
    }
  }
  return out
}

/** عددُ كتب المكتبة. وهو عددُ عناوينها: لا فرقَ بين الرقمين في هذه المكتبة. */
export function bookCount(books: Book[]): number {
  return countedTitles(books).length
}

/** ما ضُمَّ إلى الكتاب من عناوين، معروضًا كوحدات عدّ */
export function withinOf(book: Book): CountedTitle[] {
  return withinTitlesOf(book).map((t) => ({
    book,
    within: t,
    title: t.title,
    author_id: t.author_id ?? null,
    author_name: t.author_name,
    category: t.category ?? '',
    sub_category: t.sub_category ?? '',
    is_matn: t.is_matn ?? false,
  }))
}

/**
 * ما طُبِع ضمن هذا الكتاب من سجلّات قائمة برأسها.
 *
 * وهذا من عهدٍ كان المضمومُ فيه سجلًّا يشير إلى ضامِّه، وبقي لِما فُهرس قبل
 * التحويل حتى يُشغَّل `maintenance.foldWithinBooks` — فلا يسقط خبرٌ صامتًا.
 */
export function printedWithin(books: Book[], book: Book): Book[] {
  return books
    .filter((b) => b.within_book_id === book.id)
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'))
}

/** المتون الدرسية في المكتبة: سجلًّا كانت أو عنوانًا مضمومًا إلى سجلّ */
export function matnTitles(books: Book[]): CountedTitle[] {
  return countedTitles(books).filter((t) => t.is_matn)
}
