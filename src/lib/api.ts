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
  DEFAULT_SETTINGS_EXTRAS, DEFAULT_VISIBILITY,
  type Author, type Book, type BookWork, type Category, type LandingImage,
  type LandingQuote, type Loan, type Notebook, type Perk, type PerkCategory,
  type PerkFigure, type PerkKindDef, type PerkSource, type Publisher,
  type Settings,
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

/**
 * الكتاب. حقولُه المستجدّة اختياريّةٌ في المخطّط بالضرورة — في القاعدة كتبٌ
 * فُهرست قبلها، وإلزامُها يُفشل تحقّقَ المخطّط على مستنداتها — فتُسدّ ههنا
 * مرّةً واحدة كما تُسدّ حقولُ الفائدة في `toPerk`، ولا تُترك الواجهةُ تحرس
 * كلَّ حقلٍ في كل موضعٍ يقرؤه.
 *
 * وهذا حدُّ الدرس الذي كلّفنا صفحةً بيضاء: `condition_notes` كان اختياريًّا،
 * فنادَى عليه `catalogScore` بـ`.trim()` فسقطت شجرةُ العرض كلُّها على صاحب
 * المكتبة دون الزائر — إذ الزائرُ يقرأ ما مرّ بـ`redactBook` وهي تسدّ، وهو
 * يقرأ المستندَ خامًا. فالسدُّ ههنا يعمّ الطريقَين جميعًا.
 */
function toBook(row: Record<string, unknown>): Book {
  return {
    ...(row as unknown as Book),
    publisher_scope: (row.publisher_scope as string) ?? '',
    co_publishers: (row.co_publishers as Book['co_publishers']) ?? [],
    volume_years: (row.volume_years as number[]) ?? [],
    issue_kind: (row.issue_kind as string) ?? '',
    issue_by: (row.issue_by as string) ?? '',
    issue_year: (row.issue_year as number | null) ?? null,
    // النسخةُ الواحدة هي الأصل، فالغيابُ يُردّ إليها لا إلى صفر
    copies: (row.copies as number) ?? 1,
    is_matn: (row.is_matn as boolean) ?? false,
    edition_of: (row.edition_of as string | null) ?? null,
    is_collection: (row.is_collection as boolean) ?? false,
    within_titles: (row.within_titles as Book['within_titles']) ?? [],
    within_book_id: (row.within_book_id as string | null) ?? null,
    within_pages: (row.within_pages as string) ?? '',
  }
}

export async function fetchBooks(_owner: boolean): Promise<Book[]> {
  const rows = await convex.query(api.library.books, {})
  return (rows as unknown as Record<string, unknown>[]).map(toBook)
}

export async function fetchAuthors(_owner: boolean): Promise<Author[]> {
  return (await convex.query(api.library.authors, {})) as unknown as Author[]
}

export async function fetchWorks(_owner: boolean): Promise<BookWork[]> {
  return (await convex.query(api.library.works, {})) as unknown as BookWork[]
}

/**
 * الفوائد. حقولُها المستجدّة اختياريّةٌ في المخطّط — في القاعدة فوائدُ كُتبت
 * قبلها — فتُسدّ ههنا مرّةً واحدة، ولا تُترك الواجهةُ تحرس كلَّ حقلٍ في كل
 * موضعٍ يقرؤه.
 */
function toPerk(row: Record<string, unknown>): Perk {
  const src = row.source as Partial<PerkSource> | undefined | null
  // النوعُ الواحد والبابُ الواحد صارا قائمتين، فما فُهرس بهما قبلُ يُرفع
  // إليهما ههنا — ولا تُسأل الواجهةُ عن الصورتين في كل موضعٍ تقرؤهما
  const kind = (row.kind as string) ?? ''
  const category = (row.category as string) ?? ''
  const subCategory = (row.sub_category as string) ?? ''
  return {
    ...(row as unknown as Perk),
    book_id: (row.book_id as string | null) ?? null,
    kinds: (row.kinds as string[]) ?? (kind ? [kind] : []),
    text_html: (row.text_html as string) ?? '',
    footnotes: (row.footnotes as Perk['footnotes']) ?? [],
    volume: (row.volume as string) ?? '',
    categories: (row.categories as string[]) ?? (category ? [category] : []),
    sub_categories: (row.sub_categories as string[]) ?? (subCategory ? [subCategory] : []),
    tags: (row.tags as string[]) ?? [],
    people: (row.people as string[]) ?? [],
    rating: (row.rating as number) ?? 0,
    notebook_ids: (row.notebook_ids as string[]) ?? [],
    comment: (row.comment as string) ?? '',
    source: src ? { title: '', author: '', death: '', edition: '', ...src } : null,
  }
}

export async function fetchPerks(_owner: boolean): Promise<Perk[]> {
  const rows = await convex.query(api.library.perks, {})
  return (rows as unknown as Record<string, unknown>[]).map(toPerk)
}

/** أنواعُ الفوائد كما حُرِّرت. وفراغُها: لم تُحرَّر بعد، فيُعرض المبدأ. */
export async function fetchPerkKinds(_owner: boolean): Promise<PerkKindDef[]> {
  const rows = await convex.query(api.library.perkKinds, {}) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? '',
    icon: (r.icon as string) ?? '',
    hint: (r.hint as string) ?? '',
  }))
}

export async function fetchPerkCategories(_owner: boolean): Promise<PerkCategory[]> {
  const rows = await convex.query(api.library.perkCategories, {}) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? '',
    parent: (r.parent as string) ?? '',
    icon: (r.icon as string) ?? '',
  }))
}

export async function fetchPerkFigures(_owner: boolean): Promise<PerkFigure[]> {
  const rows = await convex.query(api.library.perkFigures, {}) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? '',
    death: (r.death as string) ?? '',
    note: (r.note as string) ?? '',
  }))
}

export async function fetchNotebooks(_owner: boolean): Promise<Notebook[]> {
  const rows = await convex.query(api.library.perkNotebooks, {}) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? '',
    note: (r.note as string) ?? '',
    icon: (r.icon as string) ?? '',
    created_at: (r.created_at as string) ?? '',
  }))
}

export async function fetchLoans(_owner: boolean): Promise<Loan[]> {
  return (await convex.query(api.library.loans, {})) as unknown as Loan[]
}

export async function fetchPublishers(_owner: boolean): Promise<Publisher[]> {
  return (await convex.query(api.library.publishers, {})) as unknown as Publisher[]
}

export async function fetchCategories(_owner: boolean): Promise<Category[]> {
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
  // الحقول المستجدّة اختياريّة في المخطّط، فقد يعود المستند القديم بلا بعضها
  return {
    ...DEFAULT_SETTINGS_EXTRAS,
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

export async function deleteWork(id: string): Promise<void> {
  await convex.mutation(api.books.removeWork, { id: id as Id<'book_works'> })
}

/**
 * ما يُكتب في الفائدة إدخالًا وتعديلًا. وليس فيه نفاستُها ولا كرّاساتُها:
 * تلك تُعلَّم من صفحتها، وهذه تُضاف من صفحة الكرّاسة — ولكلٍّ دالّتُه، فلا
 * يمحو حفظُ النموذج ما لم يُسأل عنه فيه.
 */
export type PerkInput = Omit<Perk, 'id' | 'created_at' | 'rating' | 'notebook_ids'>

/** المستندُ كما يقبله المُحوِّل: المعرّفُ معرّفَ Convex، والفارغُ null */
function fromPerk(perk: PerkInput) {
  return {
    ...perk,
    book_id: (perk.book_id as Id<'books'> | null) ?? null,
    source: perk.source ?? undefined,
  }
}

export async function insertPerk(perk: PerkInput): Promise<void> {
  await convex.mutation(api.catalog.insertPerk, fromPerk(perk) as never)
}

export async function updatePerk(id: string, perk: PerkInput): Promise<void> {
  await convex.mutation(api.catalog.updatePerk, {
    id: id as Id<'perks'>,
    patch: fromPerk(perk) as never,
  })
}

/** نفاسةُ الفائدة، تُعلَّم من صفحتها */
export async function setPerkRating(id: string, rating: number): Promise<void> {
  await convex.mutation(api.catalog.setPerkRating, { id: id as Id<'perks'>, rating })
}

/** كرّاساتُ الفائدة، تُضاف إليها من صفحة الكرّاسة */
export async function setPerkNotebooks(id: string, notebookIds: string[]): Promise<void> {
  await convex.mutation(api.catalog.setPerkNotebooks, {
    id: id as Id<'perks'>, notebook_ids: notebookIds,
  })
}

export async function deletePerk(id: string): Promise<void> {
  await convex.mutation(api.catalog.deletePerk, { id: id as Id<'perks'> })
}

// --------------------------------------------- أثاثُ القسم: أنواعُه وأبوابُه

/** الأنواعُ تُحفظ قائمةً واحدة: ما زاد يُنشأ، وما نقص يُحذف، والاسمُ يُزامَن */
export async function savePerkKinds(rows: PerkKindDef[]): Promise<void> {
  await convex.mutation(api.catalog.savePerkKinds, {
    rows: rows.map((r) => ({
      id: r.id || undefined, name: r.name, icon: r.icon, hint: r.hint,
    })),
  })
}

export async function savePerkCategories(rows: PerkCategory[]): Promise<void> {
  await convex.mutation(api.catalog.savePerkCategories, {
    rows: rows.map((r) => ({
      id: r.id || undefined, name: r.name, parent: r.parent, icon: r.icon,
    })),
  })
}

export async function savePerkFigures(rows: PerkFigure[]): Promise<void> {
  await convex.mutation(api.catalog.savePerkFigures, {
    rows: rows.map((r) => ({
      id: r.id || undefined, name: r.name, death: r.death, note: r.note,
    })),
  })
}

/** عَلَمٌ يُسجَّل من نموذج الفائدة نفسه، فلا يُخرَج صاحبُه إلى الإعدادات */
export async function findOrCreatePerkFigure(name: string, death = ''): Promise<void> {
  await convex.mutation(api.catalog.findOrCreatePerkFigure, { name, death })
}

export async function insertNotebook(
  name: string, note = '', icon = '',
): Promise<void> {
  await convex.mutation(api.catalog.insertNotebook, { name, note, icon })
}

export async function updateNotebook(
  id: string, patch: { name?: string; note?: string; icon?: string },
): Promise<void> {
  await convex.mutation(api.catalog.updateNotebook, {
    id: id as Id<'perk_notebooks'>, patch,
  })
}

export async function deleteNotebook(id: string): Promise<void> {
  await convex.mutation(api.catalog.deleteNotebook, { id: id as Id<'perk_notebooks'> })
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

/** وفاة المؤلِّف كما تُدخَل من نموذج الكتاب: إمّا معاصرٌ، أو تقريبٌ، أو سنة */
export async function setAuthorDeath(
  id: string,
  death: { death: number | null; era?: string; alive: boolean; approx: boolean; text: string },
): Promise<void> {
  await convex.mutation(api.catalog.setAuthorDeath, {
    id: id as Id<'authors'>,
    death: death.death,
    era: (death.era as 'هـ' | 'م' | 'ق.هـ' | 'ق.م' | undefined) ?? undefined,
    alive: death.alive,
    death_approx: death.approx,
    death_text: death.text,
  })
}

export async function findOrCreatePublisher(name: string, place: string): Promise<Publisher> {
  return (await convex.mutation(
    api.catalog.findOrCreatePublisher, { name, place },
  )) as unknown as Publisher
}

export async function updatePublisher(id: string, patch: Partial<Publisher>): Promise<void> {
  const { id: _drop, created_at: _drop2, ...rest } = patch as Partial<Publisher>
    & { id?: string; created_at?: string }
  await convex.mutation(api.catalog.updatePublisher, {
    id: id as Id<'publishers'>,
    patch: rest as never,
  })
}

export async function removePublisher(id: string): Promise<void> {
  await convex.mutation(api.catalog.removePublisher, { id: id as Id<'publishers'> })
}

export async function addCategory(
  name: string, position: number, parent = '',
): Promise<void> {
  await convex.mutation(api.catalog.addCategory, { name, position, parent })
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
