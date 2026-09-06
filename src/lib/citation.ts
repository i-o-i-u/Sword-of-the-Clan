// الإحالة إلى الكتاب كما تُوضع في جريدة المصادر.
//
// وهي مشتركةٌ بين بطاقة الكتاب وفوائد الكنّاش: الفائدةُ لا تُنقل بغير عزوٍ
// إلى مصدره، وصياغةُ العزو واحدةٌ في الموضعين فلا تفترق.

import { toArabicDigits, yearLabel } from './hijri'
import { pressesLine } from './editions'
import { sourceKindOf } from './types'
import type { Author, Book, Perk, PerkSource } from './types'

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
  'ضبْط النصّ': 'ضبط نصّه',
  // الإشرافُ يُذكر في العزو بحرفه: «بإشراف فلان»، لا «إشراف فلان»
  'الإشراف العلميّ': 'بإشراف',
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

  // دُورُ النشرة كلُّها معطوفةً: الغلافُ يحمل شعارَ الدارَين، فيُذكران معًا
  const presses = pressesLine(book)
  if (presses) {
    const edition = book.edition.trim()
      ? `الطبعة ${book.edition_worded ? book.edition.trim() : toArabicDigits(book.edition.trim())}، `
      : ''
    parts.push(`${edition}طبعة ${presses}`)
  }

  const year = book.year_approx
    ? book.year_text.trim()
    : (book.year != null ? yearLabel(book.year, book.year_era) : '')
  const place = book.place.trim()
  if (year && place) parts.push(`${year} - ${place}`)
  else if (year) parts.push(year)
  else if (place) parts.push(place)

  // والمصوَّرةُ وإعادةُ الصفّ تُذكران في العزو: العزوُ إلى النشرة الأصل —
  // وهي ما تقدَّم — وهذا خبرٌ عن النسخة التي وقع النقلُ منها، ومن حقّ من
  // يراجع أن يعرفه ليُصيب الصفحة نفسَها.
  const issue = (book.issue_kind ?? '').trim()
  if (issue) {
    const by = (book.issue_by ?? '').trim()
    const at = book.issue_year != null
      ? toArabicDigits(yearLabel(book.issue_year, book.year_era))
      : ''
    parts.push([issue, by, at].filter(Boolean).join(' '))
  }

  return `${parts.join('، ')}.`
}

/**
 * موضعُ الفائدة من مصدرها: «ج٤، ص٨٥»، أو «ص٨٥» لمن لا مجلَّدَ له.
 *
 * **وذاك للكتاب وحدَه**: ما سُمع في مجلسٍ لا صفحةَ له، والتسجيلُ موضعُه منه
 * دقيقةٌ تُكتب كما هي — «د ١٢:٤٠» — فلا يُقال فيها «ص».
 */
export function perkLocation(perk: Perk): string {
  const page = perk.page.trim()
  if (perk.source && !sourceKindOf(perk.source.kind).isBook) {
    return page ? toArabicDigits(page) : ''
  }

  const volume = (perk.volume ?? '').trim()
  const parts = [
    volume && `ج${toArabicDigits(volume)}`,
    page && `ص${toArabicDigits(page)}`,
  ].filter(Boolean)
  return parts.join('، ')
}

/**
 * عزوُ ما ليس بكتابٍ من الفهرس: كتابٌ من خارجها، أو سماعٌ، أو صفحةُ شبكة،
 * أو منشور، أو تسجيل. ولكلٍّ ترتيبُه كما يُكتب في الحاشية:
 *
 *   • الكتابُ  — عنوانُه، فمؤلِّفُه (ووفاتُه بين قوسين)، فطبعتُه.
 *   • السماعُ  — «سماعًا من فلان»، فالمجلس، فالتاريخ. والصدارةُ لمن سُمع
 *     منه لا للموضوع: العهدةُ عليه، وهو المطلوبُ في العزو.
 *   • ما سواه — عنوانُه، فصاحبُه، فالموقع، فالرابط، فالتاريخ.
 *
 * وما لم يُسجَّل يسقط من السطر ولا يُترك له موضعٌ فارغ، كما في `citationOf`.
 */
function sourceCitation(source: PerkSource): string {
  const kind = sourceKindOf(source.kind)
  const title = source.title.trim()
  const who = source.author.trim()
  const death = source.death.trim()
  // ووفاةُ المؤلِّف بين قوسين بعد اسمه، كما تُكتب في الحاشية
  const named = [who, death].filter(Boolean).join(' ').replace(/^(.+?) (ت .+)$/, '$1 ($2)')

  const parts = kind.name === 'سماع'
    ? [who && `سماعًا من ${who}`, title, source.venue.trim(), source.date.trim()]
    : [
      title,
      kind.isBook ? named : who,
      kind.isBook ? source.edition.trim() : source.venue.trim(),
      kind.hasUrl ? source.url.trim() : '',
      source.date.trim(),
    ]

  // وجنسُه يُذكر إن لم يبقَ من السطر ما يدلّ عليه
  const line = parts.filter(Boolean).join('، ')
  return `${line || kind.badge}.`
}

/**
 * عزوُ الفائدة: مصدرُها ثم موضعُها منه. والمصدرُ إمّا كتابٌ من الفهرس فتُؤخذ
 * إحالتُه كاملةً، وإمّا مصدرٌ كُتب نصًّا فيُنقل كما كُتب.
 *
 * والعزوُ يسبقه نصُّ الفائدة بين قوسين حين يُطلب تامًّا، ليُلصَق في موضعه من
 * البحث بلا إعادة كتابة.
 */
export function perkCitation(
  perk: Perk, book: Book | undefined, author: Author | null, withText = true,
): string {
  const source = book
    ? citationOf(book, author)
    : (perk.source ? sourceCitation(perk.source) : '')

  const place = perkLocation(perk)
  const tail = place ? `${source.replace(/\.$/, '')}، ${place}.` : source

  if (!withText) return tail
  return `«${perk.text.trim()}»\n${tail}`
}
