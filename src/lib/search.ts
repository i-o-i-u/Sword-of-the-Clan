// خوارزمية البحث العربي (§٥-٢). هي قلب البحث في هذا الفهرس:
// تُسقِط التشكيل والتطويل، وتوحّد الهمزات والتاء المربوطة ما لم يُطلب خلاف ذلك.

import type { Book, Perk } from './types'

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
  let x = String(text ?? '').replace(/[ً-ْٰـ]/g, '')
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
  const texts = keys.map((k) => normalizeText(fieldText(b, k), o))
  if (o.exact) return texts.some((t) => t === needle)
  if (o.anyOrder) {
    const all = texts.join(' | ')
    return needle.split(' ').filter(Boolean).every((w) => all.includes(w))
  }
  return texts.some((t) => t.includes(needle))
}

/**
 * القيدُ يُطابَق بنصّه وعنوانه وتعليقه وبابه وأعلامه ووسومه وكرّاسته، ثم
 * بعنوان مصدره ومؤلِّفه — بمعيار البحث نفسه: بلا تشكيلٍ ولا تفريقٍ بين
 * الهمزات.
 *
 * و`sourceText` يأتي من خارج: الكتابُ في `perks` معرّفٌ لا عنوان، ومن يبحث
 * عن «مجالس ثعلب» يريد ما قُيِّد منه.
 */
export function matchPerk(p: Perk, query: string, o: SearchOptions, sourceText = ''): boolean {
  const needle = normalizeText(query, o)
  if (!needle) return true
  const hay = normalizeText([
    p.title, p.text, p.comment, p.notebook, p.kind,
    p.category, p.sub_category,
    (p.tags ?? []).join(' '), (p.people ?? []).join(' '),
    p.source?.title ?? '', p.source?.author ?? '', p.source?.edition ?? '',
    sourceText,
  ].join(' '), o)
  if (o.anyOrder) return needle.split(' ').filter(Boolean).every((w) => hay.includes(w))
  return hay.includes(needle)
}
