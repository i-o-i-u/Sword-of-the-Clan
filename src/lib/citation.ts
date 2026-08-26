// الإحالة إلى الكتاب كما تُوضع في جريدة المصادر.
//
// وهي مشتركةٌ بين بطاقة الكتاب وقيود «الفوائد»: القيدُ لا يُنقل بغير عزوٍ
// إلى مصدره، وصياغةُ العزو واحدةٌ في الموضعين فلا تفترق.

import { toArabicDigits, yearLabel } from './hijri'
import type { Author, Book, Perk } from './types'

/**
 * صياغةُ الصفة في جريدة المراجع: هناك تُذكر بالمصدر لا بالوصف — «تحقيق
 * فلان» لا «المُحقِّق فلان». وما لا مصدر له في القائمة يُترك على لفظه.
 */
const CITATION_VERB: Record<string, string> = {
  'المُحقِّق': 'تحقيق',
  'المُراجِع': 'مراجعة',
  'المُعتَني': 'اعتناء',
  'المُصحِّح': 'تصحيح',
  'المُخَرِّج': 'تخريج',
  'المُتَرجِم': 'ترجمة',
  'تَقْرِيظ': 'تقريظ',
  'تقديم': 'تقديم',
}

/**
 * سطرُ الإحالة كما يُوضع في جريدة المصادر: العنوان، فالمؤلِّف، فمن عمل فيه،
 * فالطبعة ودارُها وسنتُها وبلدُها. وما لم يُسجَّل يسقط من السطر ولا يُترك
 * له موضعٌ فارغ.
 */
export function citationOf(book: Book, author: Author | null): string {
  const parts: string[] = [book.title.trim()]

  const name = author?.full_name?.trim() || author?.name?.trim() || book.author_name.trim()
  if (name) parts.push(name)

  // من عمل في الكتاب، مجموعًا بصفته: «تحقيق فلان وفلان»
  const byRole = new Map<string, string[]>()
  for (const c of book.contributors ?? []) {
    const who = c.name.trim()
    if (who) byRole.set(c.role, [...(byRole.get(c.role) ?? []), who])
  }
  byRole.forEach((names, role) => {
    parts.push(`${CITATION_VERB[role] ?? role} ${names.join(' و')}`)
  })

  if (book.publisher.trim()) {
    const edition = book.edition.trim()
      ? `الطبعة ${book.edition_worded ? book.edition.trim() : toArabicDigits(book.edition.trim())}، `
      : ''
    parts.push(`${edition}طبعة ${book.publisher.trim()}`)
  }

  const year = book.year_approx
    ? book.year_text.trim()
    : (book.year != null ? yearLabel(book.year, book.year_era) : '')
  const place = book.place.trim()
  if (year && place) parts.push(`${year} - ${place}`)
  else if (year) parts.push(year)
  else if (place) parts.push(place)

  return `${parts.join('، ')}.`
}

/** موضعُ القيد من كتابه: «ج٤، ص٨٥»، أو «ص٨٥» لمن لا مجلَّدَ له */
export function perkLocation(perk: Perk): string {
  const volume = (perk.volume ?? '').trim()
  const page = perk.page.trim()
  const parts = [
    volume && `ج${toArabicDigits(volume)}`,
    page && `ص${toArabicDigits(page)}`,
  ].filter(Boolean)
  return parts.join('، ')
}

/**
 * عزوُ القيد: مصدرُه ثم موضعُه منه. والمصدرُ إمّا كتابٌ من الفهرس فتُؤخذ
 * إحالتُه كاملةً، وإمّا مصدرٌ كُتب نصًّا فيُنقل كما كُتب.
 *
 * والعزوُ يسبقه نصُّ القيد بين قوسين حين يُطلب تامًّا، ليُلصَق في موضعه من
 * البحث بلا إعادة كتابة.
 */
export function perkCitation(
  perk: Perk, book: Book | undefined, author: Author | null, withText = true,
): string {
  const source = book
    ? citationOf(book, author)
    : [
      (perk.source?.title ?? '').trim(),
      (perk.source?.author ?? '').trim(),
      (perk.source?.edition ?? '').trim(),
    ].filter(Boolean).join('، ') + '.'

  const place = perkLocation(perk)
  const tail = place ? `${source.replace(/\.$/, '')}، ${place}.` : source

  if (!withText) return tail
  return `«${perk.text.trim()}»\n${tail}`
}
