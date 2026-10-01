// خوارزمية البحث العربي (§٥-٢). هي قلب البحث في هذا الفهرس:
// تُسقِط التشكيل والتطويل، وتوحّد الهمزات والتاء المربوطة ما لم يُطلب خلاف ذلك.

import type { Book, Perk, WithinTitle } from './types'

export interface SearchOptions {
  caseSensitive: boolean
  respectHamza: boolean
  exact: boolean
  anyOrder: boolean
}

/** البحث السريع: يتغاضى عن كل شيء، ويشمل الحقول كلها */
export const QUICK_OPTS: SearchOptions = {
  caseSensitive: false, respectHamza: false, exact: false, anyOrder: true,
}

export const SEARCH_FIELDS: { key: string; label: string; def: boolean }[] = [
  { key: 'title',      label: 'العنوان',        def: true },
  { key: 'subtitle',   label: 'العنوان الفرعي', def: true },
  { key: 'author',     label: 'المؤلف',         def: true },
  { key: 'contributors', label: 'المحقِّق ونحوه', def: true },
  { key: 'publisher',  label: 'دار النشر',      def: true },
  { key: 'series',     label: 'السلسلة',        def: false },
  { key: 'category',   label: 'التصنيف',        def: false },
  { key: 'topic',      label: 'الموضوع',        def: true },
  { key: 'tags',       label: 'الوسوم',         def: true },
  { key: 'keywords',   label: 'كلمات مفتاحية',  def: true },
  { key: 'notes',      label: 'الملاحظات',      def: false },
  { key: 'isbn',       label: 'ردمك',           def: false },
  { key: 'marginNote', label: 'طُرَّة الكتاب',    def: false },
  { key: 'cabinet',    label: 'رقم الدولاب',    def: false },
  { key: 'shelfNo',    label: 'رقم الرفّ',       def: false },
]

export const ALL_SEARCH_KEYS = SEARCH_FIELDS.map((f) => f.key)
export const DEFAULT_SEARCH_KEYS = SEARCH_FIELDS.filter((f) => f.def).map((f) => f.key)

export function normalizeText(text: unknown, o: SearchOptions): string {
  // إسقاط التشكيل والتطويل
  // والمدىُ إلى U+065F لا إلى السكون وحده: فيه المدّةُ والهمزتان العُليا
  // والسُّفلى وما يُكتب فوق الحرف، وكانت تبقى فتفرّق بين الكلمة وأختها
  let x = String(text ?? '').replace(/[ً-ٰٟـ]/g, '')
  if (!o.caseSensitive) x = x.toLowerCase()
  if (!o.respectHamza) {
    x = x
      .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ → ا
      .replace(/ؤ/g, 'و')                     // ؤ → و
      .replace(/ئ/g, 'ي')                     // ئ → ي
      .replace(/ى/g, 'ي')                     // ى → ي
      .replace(/ة/g, 'ه')                     // ة → ه
  }
  return x.replace(/\s+/g, ' ').trim()
}

function fieldText(b: Book, key: string): string {
  switch (key) {
    case 'tags': return (b.tags ?? []).join(' ')
    // الكلمات المفتاحية لا تُعرض على البطاقة، وإنما تُقصد هنا
    case 'keywords': return (b.keywords ?? []).join(' ')
    // اسم المؤلِّف الأول ومن شاركه
    case 'author': return [b.author_name, ...(b.co_authors ?? []).map((c) => c.name)].join(' ')
    case 'contributors': return (b.contributors ?? []).map((c) => c.name).join(' ')
    // دُورُ النشرة كلُّها: من بحث عن دارٍ شارَكت في إخراج كتابٍ أصابه بها
    case 'publisher': return [
      b.publisher,
      ...(b.co_publishers ?? []).map((c) => c.name),
      b.issue_by ?? '',
    ].filter(Boolean).join(' ')
    // التصنيف رئيسُه وفرعُه جميعًا: من بحث عن «النحو» أصابه من فرعه
    case 'category': return [b.category, b.sub_category].filter(Boolean).join(' ')
    case 'marginNote': return b.margin_note ?? ''
    case 'cabinet': return b.cabinet_no ?? ''
    case 'shelfNo': return b.shelf_no ?? ''
    default: {
      const v = (b as unknown as Record<string, unknown>)[key]
      return v == null ? '' : String(v)
    }
  }
}

export function matchBook(b: Book, query: string, o: SearchOptions, keys: string[]): boolean {
  const needle = normalizeText(query, o)
  if (!needle) return true
  return matchTexts(bookTexts(b, o, keys), needle, o)
}

/**
 * نصوصُ الكتاب مُطبَّعةً، حقلًا حقلًا. تُحسب مرّةً لكل كتابٍ وتُحفظ، فلا
 * يُعاد تطبيعُ الفهرس كلِّه مع كل حرفٍ يُكتب في البحث — وكان يُعاد مرّاتٍ
 * بعدد وجوه التصفية، إذ يُحسب عدّادُ كل دولابٍ وتصنيفٍ بالبحث نفسه.
 */
export function bookTexts(b: Book, o: SearchOptions, keys: string[]): string[] {
  return keys.map((k) => normalizeText(fieldText(b, k), o))
}

/** نصُّ العنوان المضموم مُطبَّعًا: ما ينفرد به عن ضامِّه (انظر `matchWithin`) */
export function withinText(t: WithinTitle, o: SearchOptions): string {
  return normalizeText([
    t.title, t.author_name,
    (t.contributors ?? []).map((c) => c.name).join(' '),
    t.category ?? '', t.sub_category ?? '',
  ].join(' '), o)
}

/** مطابقةُ نصوصٍ مُطبَّعةٍ سلفًا بإبرةٍ مُطبَّعة */
export function matchTexts(texts: string[], needle: string, o: SearchOptions): boolean {
  if (!needle) return true
  if (o.exact) return texts.some((t) => t === needle)
  if (o.anyOrder) {
    const all = texts.join(' | ')
    return needle.split(' ').filter(Boolean).every((w) => all.includes(w))
  }
  return texts.some((t) => t.includes(needle))
}

/**
 * رتبةُ الكتاب في نتائج البحث السريع: ما طابق عنوانُه أوّلًا، ثم ما ابتدأ
 * عنوانُه بالكلمة، ثم ما احتواها، ثم ما طابق في مؤلِّفه، ثم سائرُ الحقول.
 * وكانت النتائجُ على ترتيب الإدخال، فقد يكون الكتابُ المطلوب بعينه
 * الخامسَ عشرَ فلا يُعرض.
 */
export function bookRank(b: Book, query: string): number {
  const needle = normalizeText(query, QUICK_OPTS)
  const title = normalizeText(b.title, QUICK_OPTS)
  if (title === needle) return 0
  if (title.startsWith(needle)) return 1
  if (title.includes(needle)) return 2
  if (normalizeText(b.author_name, QUICK_OPTS).includes(needle)) return 3
  return 4
}

/**
 * العنوانُ المضموم يُطابَق بما ينفرد به: عنوانُه ومؤلِّفُه وذوو صفاته
 * وتصنيفُه — وما سواه بيانات ضامِّه، تُطابَق فيه لا ههنا.
 *
 * وهذا لازمٌ: العنوانُ المضموم كتابٌ في المكتبة، فمن بحث عن «الأربعون
 * النووية» وهي في «برنامج مهمّات العلم» وجب أن يجدها — وإلّا كان في الفهرس
 * كتابٌ لا سبيل إليه.
 */
export function matchWithin(t: WithinTitle, query: string, o: SearchOptions): boolean {
  const needle = normalizeText(query, o)
  if (!needle) return true
  const hay = withinText(t, o)
  if (o.anyOrder) return needle.split(' ').filter(Boolean).every((w) => hay.includes(w))
  return hay.includes(needle)
}

/**
 * الفائدةُ تُطابَق بنصّها وعنوانها وتعليقها وأنواعها وتصنيفاتها وأعلامها
 * ووسومها، ثم بعنوان مصدرها ومؤلِّفه — بمعيار البحث نفسه: بلا تشكيلٍ ولا
 * تفريقٍ بين الهمزات. والنصُّ المقروء هو المجرَّد لا المنسَّق، فلا يُطابَق
 * اسمُ وسمٍ في HTML ويُحسَب كلامَ المؤلِّف.
 *
 * و`sourceText` يأتي من خارج: الكتابُ في `perks` معرّفٌ لا عنوان، ومن يبحث
 * عن «مجالس ثعلب» يريد ما قُيِّد منه.
 */
export function matchPerk(p: Perk, query: string, o: SearchOptions, sourceText = ''): boolean {
  const needle = normalizeText(query, o)
  if (!needle) return true
  const hay = normalizeText([
    p.title, p.text, p.comment,
    (p.kinds ?? []).join(' '),
    (p.categories ?? []).join(' '), (p.sub_categories ?? []).join(' '),
    (p.tags ?? []).join(' '), (p.people ?? []).join(' '),
    p.source?.title ?? '', p.source?.author ?? '', p.source?.edition ?? '',
    sourceText,
  ].join(' '), o)
  if (o.anyOrder) return needle.split(' ').filter(Boolean).every((w) => hay.includes(w))
  return hay.includes(needle)
}
