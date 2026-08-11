// طبقة البيانات: كل ما يُقرأ ويُكتب في Supabase يمرّ من هنا.
//
// القراءة لها مصدران:
//   • صاحب المكتبة يقرأ الجداول الأصلية (RLS تفتحها له وحده).
//   • الزائر يقرأ العروض العامة public_* التي طبّقت الخصوصية داخل قاعدة
//     البيانات، فلا يصله المخفيّ أصلًا. لا تعتمد على إخفاءٍ في المتصفح.
// الكتابة لا تكون إلا لصاحب المكتبة، وعلى الجداول الأصلية دائمًا.

import { supabase } from './supabaseClient'
import {
  DEFAULT_VISIBILITY,
  type Author, type Book, type BookWork, type LandingSlide,
  type Loan, type Perk, type Settings,
} from './types'

const src = (owner: boolean, table: string) => (owner ? table : `public_${table}`)

// ---------------------------------------------------------------------------
// صاحب المكتبة
// ---------------------------------------------------------------------------

export async function ownerExists(): Promise<boolean> {
  const { data, error } = await supabase.rpc('owner_exists')
  if (error) throw error
  return !!data
}

export interface OwnerRecord { user_id: string; display_name: string }

/** يعيد صفّ صاحب المكتبة إن كان المستخدم الحالي هو صاحبها، وإلا null */
export async function fetchOwnerRecord(): Promise<OwnerRecord | null> {
  const { data, error } = await supabase
    .from('library_owner')
    .select('user_id, display_name')
    .maybeSingle()
  if (error) return null
  return data as OwnerRecord | null
}

/** حجز حساب صاحب المكتبة مرةً واحدة — تمنع السياسةُ الثانيةَ */
export async function claimOwnership(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('library_owner')
    .insert({ id: 1, user_id: userId, display_name: displayName })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// القراءة
// ---------------------------------------------------------------------------

export async function fetchBooks(owner: boolean): Promise<Book[]> {
  const { data, error } = await supabase.from(src(owner, 'books')).select('*')
  if (error) throw error
  return (data ?? []).map(normalizeBook)
}

export async function fetchAuthors(owner: boolean): Promise<Author[]> {
  const { data, error } = await supabase.from(src(owner, 'authors')).select('*')
  if (error) throw error
  return (data ?? []) as Author[]
}

export async function fetchWorks(owner: boolean): Promise<BookWork[]> {
  const { data, error } = await supabase
    .from(src(owner, 'book_works'))
    .select('id, book_id, target_book_id, type')
  if (error) throw error
  return (data ?? []) as BookWork[]
}

export async function fetchPerks(owner: boolean): Promise<Perk[]> {
  const { data, error } = await supabase
    .from(src(owner, 'perks'))
    .select('id, book_id, kind, title, text, page, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Perk[]
}

export async function fetchLoans(owner: boolean): Promise<Loan[]> {
  const { data, error } = await supabase
    .from(src(owner, 'loans'))
    .select('id, book_id, borrower, lent_date, due_date, returned')
    .order('lent_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as Loan[]
}

export async function fetchShelves(owner: boolean): Promise<string[]> {
  const { data, error } = await supabase
    .from(src(owner, 'shelves')).select('name, position').order('position')
  if (error) throw error
  return (data ?? []).map((r: { name: string }) => r.name)
}

export async function fetchCategories(owner: boolean): Promise<string[]> {
  const { data, error } = await supabase
    .from(src(owner, 'categories')).select('name, position').order('position')
  if (error) throw error
  return (data ?? []).map((r: { name: string }) => r.name)
}

export async function fetchSlides(owner: boolean): Promise<LandingSlide[]> {
  const { data, error } = await supabase
    .from(src(owner, 'landing_slides'))
    .select('id, image_url, quote, author, position')
    .order('position')
  if (error) throw error
  return (data ?? []) as LandingSlide[]
}

/** جدول الإعدادات اسمه library_settings، وعرضه العام public_settings */
const settingsTable = (owner: boolean) => (owner ? 'library_settings' : 'public_settings')

export async function fetchSettings(owner: boolean): Promise<Settings> {
  const { data, error } = await supabase
    .from(settingsTable(owner)).select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  const row = (data ?? {}) as Record<string, unknown>
  return {
    theme: (row.theme as Settings['theme']) ?? 'warm',
    font: (row.font as Settings['font']) ?? 'kitab',
    ui_scale: (row.ui_scale as number) ?? 100,
    show_status_dots: row.show_status_dots !== false,
    show_ratings: row.show_ratings !== false,
    default_view: (row.default_view as Settings['default_view']) ?? 'grid',
    currency: (row.currency as string) ?? 'ريال',
    landing_title: (row.landing_title as string) ?? 'مكتبة سيف العشيرة',
    landing_tagline: (row.landing_tagline as string) ?? 'فهرسٌ حيّ لكل كتابٍ في البيت',
    landing_intro: (row.landing_intro as string) ?? '',
    show_landing_stats: row.show_landing_stats !== false,
    show_landing_quote: row.show_landing_quote !== false,
    auto_rotate: row.auto_rotate !== false,
    rotate_seconds: (row.rotate_seconds as number) ?? 6,
    visibility: { ...DEFAULT_VISIBILITY, ...((row.visibility as object) ?? {}) },
    // لا تصل هذه القوائم إلى الزائر، فتبقى فارغة عنده
    hidden_fields: (row.hidden_fields as string[]) ?? [],
    hidden_categories: (row.hidden_categories as string[]) ?? [],
    hidden_book_ids: (row.hidden_book_ids as string[]) ?? [],
  }
}

/** يملأ الحقول الناقصة ويضبط أنواعها حتى تتساوى صفوف الجدول والعرض */
function normalizeBook(row: Record<string, unknown>): Book {
  const volumePages = row.volume_pages
  return {
    ...(row as unknown as Book),
    tags: (row.tags as string[]) ?? [],
    volume_pages: Array.isArray(volumePages) ? (volumePages as (number | string)[]) : [],
    spine_images: (row.spine_images as Record<string, string>) ?? {},
    value: row.value == null ? null : Number(row.value),
    rating: Number(row.rating ?? 0),
  }
}

// ---------------------------------------------------------------------------
// الكتابة — لصاحب المكتبة وحده
// ---------------------------------------------------------------------------

export type BookInput = Partial<Omit<Book, 'id' | 'created_at'>>

export async function insertBook(input: BookInput): Promise<Book> {
  const { data, error } = await supabase.from('books').insert(input).select('*').single()
  if (error) throw error
  return normalizeBook(data)
}

export async function updateBook(id: string, patch: BookInput): Promise<void> {
  const { error } = await supabase.from('books').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

/**
 * يربط الكتاب بمؤلِّفه: إن وُجد الاسم أُلحق به، وإلا أُنشئت له صفحة (§١١/٥).
 * تُطابَق الأسماء بعد قصّ الفراغات، والاسم فريدٌ في قاعدة البيانات.
 */
export async function findOrCreateAuthor(name: string): Promise<Author> {
  const trimmed = name.trim()
  const { data: found, error: findError } = await supabase
    .from('authors').select('*').eq('name', trimmed).maybeSingle()
  if (findError) throw findError
  if (found) return found as Author

  const { data, error } = await supabase
    .from('authors').insert({ name: trimmed }).select('*').single()
  if (error) throw error
  return data as Author
}

export async function updateAuthor(id: string, patch: Partial<Author>): Promise<void> {
  const { error } = await supabase.from('authors').update(patch).eq('id', id)
  if (error) throw error
}

export async function insertWorks(
  bookId: string,
  works: { target_book_id: string; type: string }[],
): Promise<void> {
  if (!works.length) return
  const { error } = await supabase
    .from('book_works')
    .insert(works.map((w) => ({ book_id: bookId, ...w })))
  if (error) throw error
}

export async function insertPerk(
  perk: { book_id: string; kind: string; title: string; text: string; page: string },
): Promise<void> {
  const { error } = await supabase.from('perks').insert(perk)
  if (error) throw error
}

export async function deletePerk(id: string): Promise<void> {
  const { error } = await supabase.from('perks').delete().eq('id', id)
  if (error) throw error
}

export async function insertLoan(
  loan: { book_id: string; borrower: string; due_date: string | null },
): Promise<void> {
  const { error } = await supabase.from('loans').insert(loan)
  if (error) throw error
}

export async function returnLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').update({ returned: true }).eq('id', id)
  if (error) throw error
}

export async function updateSettings(patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('library_settings').update(patch).eq('id', 1)
  if (error) throw error
}

export async function addShelf(name: string, position: number): Promise<void> {
  const { error } = await supabase.from('shelves').insert({ name, position })
  if (error) throw error
}

export async function removeShelf(name: string): Promise<void> {
  const { error } = await supabase.from('shelves').delete().eq('name', name)
  if (error) throw error
}

export async function addCategory(name: string, position: number): Promise<void> {
  const { error } = await supabase.from('categories').insert({ name, position })
  if (error) throw error
}

export async function removeCategory(name: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('name', name)
  if (error) throw error
}

export async function addSlide(position: number): Promise<void> {
  const { error } = await supabase.from('landing_slides').insert({ position })
  if (error) throw error
}

export async function updateSlide(id: string, patch: Partial<LandingSlide>): Promise<void> {
  const { error } = await supabase.from('landing_slides').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeSlide(id: string): Promise<void> {
  const { error } = await supabase.from('landing_slides').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// الصور: الأغلفة والكعوب وصور صفحة الهبوط
// ---------------------------------------------------------------------------

const BUCKET = 'library'

/** يرفع صورةً ويعيد رابطها العام. المسار يُميَّز بالوقت حتى لا تُخبَّأ القديمة */
export async function uploadImage(folder: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
