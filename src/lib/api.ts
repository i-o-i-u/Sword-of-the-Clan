// طبقة البيانات: كل ما يُقرأ ويُكتب في Convex يمرّ من هنا.
//
// الخصوصية تُطبَّق في الخادم (convex/privacy.ts) لا هنا: الدالة نفسها تعيد
// لصاحب المكتبة كل شيء، وللزائر ما سُمح له به. لذلك بقي وسيط `owner` في
// التواقيع بلا أثر — أُبقي عليه كي لا تتغيّر مواضع النداء في الواجهة، ولأن
// الاعتماد عليه أصلًا كان خطأً: الخادم لا يصدّق دعوى العميل أنه المالك.

import { convex } from './convexClient'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  DEFAULT_VISIBILITY,
  type Author, type Book, type BookWork, type LandingImage, type LandingQuote,
  type Loan, type Perk, type Settings,
} from './types'

// ---------------------------------------------------------------------------
// صاحب المكتبة
// ---------------------------------------------------------------------------

export async function ownerExists(): Promise<boolean> {
  return await convex.query(api.owner.ownerExists, {})
}

export interface OwnerRecord { user_id: string; display_name: string }

export async function fetchOwnerRecord(): Promise<OwnerRecord | null> {
  return await convex.query(api.owner.ownerRecord, {})
}

/** حجز حساب صاحب المكتبة مرةً واحدة — يمنع المُحوِّلُ الثانيَ */
export async function claimOwnership(_userId: string, displayName: string): Promise<void> {
  await convex.mutation(api.owner.claimOwnership, { display_name: displayName })
}

// ---------------------------------------------------------------------------
// القراءة
// ---------------------------------------------------------------------------

export async function fetchBooks(_owner: boolean): Promise<Book[]> {
  return (await convex.query(api.library.books, {})) as unknown as Book[]
}

export async function fetchAuthors(_owner: boolean): Promise<Author[]> {
  return (await convex.query(api.library.authors, {})) as unknown as Author[]
}

export async function fetchWorks(_owner: boolean): Promise<BookWork[]> {
  return (await convex.query(api.library.works, {})) as unknown as BookWork[]
}

export async function fetchPerks(_owner: boolean): Promise<Perk[]> {
  return (await convex.query(api.library.perks, {})) as unknown as Perk[]
}

export async function fetchLoans(_owner: boolean): Promise<Loan[]> {
  return (await convex.query(api.library.loans, {})) as unknown as Loan[]
}

export async function fetchShelves(_owner: boolean): Promise<string[]> {
  return await convex.query(api.library.shelves, {})
}

export async function fetchCategories(_owner: boolean): Promise<string[]> {
  return await convex.query(api.library.categories, {})
}

export async function fetchLandingImages(_owner: boolean): Promise<LandingImage[]> {
  return (await convex.query(api.library.landingImages, {})) as unknown as LandingImage[]
}

export async function fetchLandingQuotes(_owner: boolean): Promise<LandingQuote[]> {
  return (await convex.query(api.library.landingQuotes, {})) as unknown as LandingQuote[]
}

export async function fetchSettings(_owner: boolean): Promise<Settings> {
  const row = (await convex.query(api.library.settings, {})) as Record<string, unknown>
  return {
    ...(row as unknown as Settings),
    visibility: { ...DEFAULT_VISIBILITY, ...((row.visibility as object) ?? {}) },
  }
}

// ---------------------------------------------------------------------------
// الكتابة — لصاحب المكتبة وحده (يفرضه الخادم)
// ---------------------------------------------------------------------------

export type BookInput = Partial<Omit<Book, 'id' | 'created_at'>>

export async function insertBook(input: BookInput): Promise<Book> {
  return (await convex.mutation(api.books.insert, input as never)) as unknown as Book
}

export async function updateBook(id: string, patch: BookInput): Promise<void> {
  await convex.mutation(api.books.update, { id: id as Id<'books'>, patch: patch as never })
}

export async function deleteBook(id: string): Promise<void> {
  await convex.mutation(api.books.remove, { id: id as Id<'books'> })
}

export async function findOrCreateAuthor(name: string): Promise<Author> {
  return (await convex.mutation(api.catalog.findOrCreateAuthor, { name })) as unknown as Author
}

export async function updateAuthor(id: string, patch: Partial<Author>): Promise<void> {
  const { id: _drop, ...rest } = patch as Partial<Author> & { id?: string }
  await convex.mutation(api.catalog.updateAuthor, {
    id: id as Id<'authors'>,
    patch: rest as never,
  })
}

export async function insertWorks(
  bookId: string,
  works: { target_book_id: string; type: string }[],
): Promise<void> {
  if (!works.length) return
  await convex.mutation(api.books.insertWorks, {
    book_id: bookId as Id<'books'>,
    works: works as { target_book_id: Id<'books'>; type: string }[],
  })
}

export async function insertPerk(
  perk: { book_id: string; kind: string; title: string; text: string; page: string },
): Promise<void> {
  await convex.mutation(api.catalog.insertPerk, {
    ...perk,
    book_id: perk.book_id as Id<'books'>,
    kind: perk.kind as 'فائدة' | 'مقتطف',
  })
}

export async function deletePerk(id: string): Promise<void> {
  await convex.mutation(api.catalog.deletePerk, { id: id as Id<'perks'> })
}

export async function insertLoan(
  loan: { book_id: string; borrower: string; due_date: string | null },
): Promise<void> {
  await convex.mutation(api.catalog.insertLoan, {
    ...loan,
    book_id: loan.book_id as Id<'books'>,
  })
}

export async function returnLoan(id: string): Promise<void> {
  await convex.mutation(api.catalog.returnLoan, { id: id as Id<'loans'> })
}

export async function updateSettings(patch: Record<string, unknown>): Promise<void> {
  await convex.mutation(api.catalog.updateSettings, { patch: patch as never })
}

export async function addShelf(name: string, position: number): Promise<void> {
  await convex.mutation(api.catalog.addShelf, { name, position })
}

export async function removeShelf(name: string): Promise<void> {
  await convex.mutation(api.catalog.removeShelf, { name })
}

export async function addCategory(name: string, position: number): Promise<void> {
  await convex.mutation(api.catalog.addCategory, { name, position })
}

export async function removeCategory(name: string): Promise<void> {
  await convex.mutation(api.catalog.removeCategory, { name })
}

export async function addLandingImage(position: number): Promise<void> {
  await convex.mutation(api.catalog.addLandingImage, { position })
}

export async function updateLandingImage(id: string, patch: Partial<LandingImage>): Promise<void> {
  const { id: _drop, ...rest } = patch as Partial<LandingImage> & { id?: string }
  await convex.mutation(api.catalog.updateLandingImage, {
    id: id as Id<'landing_images'>,
    patch: rest as never,
  })
}

export async function removeLandingImage(id: string): Promise<void> {
  await convex.mutation(api.catalog.removeLandingImage, { id: id as Id<'landing_images'> })
}

export async function addLandingQuote(position: number): Promise<void> {
  await convex.mutation(api.catalog.addLandingQuote, { position })
}

export async function updateLandingQuote(id: string, patch: Partial<LandingQuote>): Promise<void> {
  const { id: _drop, ...rest } = patch as Partial<LandingQuote> & { id?: string }
  await convex.mutation(api.catalog.updateLandingQuote, {
    id: id as Id<'landing_quotes'>,
    patch: rest as never,
  })
}

export async function removeLandingQuote(id: string): Promise<void> {
  await convex.mutation(api.catalog.removeLandingQuote, { id: id as Id<'landing_quotes'> })
}

// ---------------------------------------------------------------------------
// الصور
// ---------------------------------------------------------------------------

/**
 * يرفع صورةً ويعيد رابطها. تخزين Convex بلا مجلّدات، فوسيط `folder` يبقى
 * للتوافق مع مواضع النداء ولا أثر له.
 */
export async function uploadImage(_folder: string, file: File): Promise<string> {
  const uploadUrl = await convex.mutation(api.images.generateUploadUrl, {})

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new Error(`تعذّر رفع الصورة (${res.status}).`)

  const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
  const url = await convex.query(api.images.url, { storageId })
  if (!url) throw new Error('رُفعت الصورة ولم يُعرف رابطها.')
  return url
}
