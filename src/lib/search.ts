// خوارزمية البحث العربي (§٥-٢). هي قلب البحث في هذا الفهرس:
// تُسقِط التشكيل والتطويل، وتوحّد الهمزات والتاء المربوطة ما لم يُطلب خلاف ذلك.

import type { Book } from './types'

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
  { key: 'verifier',   label: 'المحقق',         def: true },
  { key: 'translator', label: 'المترجم',        def: false },
  { key: 'publisher',  label: 'الناشر',         def: true },
  { key: 'series',     label: 'السلسلة',        def: false },
  { key: 'topic',      label: 'الموضوع',        def: true },
  { key: 'tags',       label: 'الوسوم',         def: true },
  { key: 'notes',      label: 'الملاحظات',      def: false },
  { key: 'isbn',       label: 'ردمك',           def: false },
  { key: 'shelfNo',    label: 'موضع الرف',      def: false },
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
    case 'author': return b.author_name ?? ''
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
