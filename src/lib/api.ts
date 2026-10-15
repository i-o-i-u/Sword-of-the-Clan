// طبقة البيانات: كل ما يُقرأ ويُكتب في Convex يمرّ من هنا.
//
// الخصوصية تُطبَّق في الخادم (convex/privacy.ts) لا هنا: الدالة نفسها تعيد
// لصاحب المكتبة كل شيء، وللزائر ما سُمح له به. لذلك بقي وسيط `owner` في
// التواقيع بلا أثر — أُبقي عليه كي لا تتغيّر مواضع النداء في الواجهة، ولأن
// الاعتماد عليه أصلًا كان خطأً: الخادم لا يصدّق دعوى العميل أنه المالك.

import { convex } from './convexClient'
import { shrinkImage } from './imageResize'
import type { FunctionReference } from 'convex/server'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  DEFAULT_SETTINGS_EXTRAS, DEFAULT_VISIBILITY, SOURCE_BOOK,
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
    within_title: (row.within_title as string) ?? '',
    // ومصدرُ ما ليس في المكتبة صار أجناسًا — كتابٌ وسماعٌ وشبكةٌ وتواصلٌ
    // وتسجيل — فما قُيِّد قبلها لا `kind` له، وهو كتابٌ بالضرورة: ذاك كلُّ
    // ما كان يُقبل يومئذٍ. ويُسدّ ههنا مرّةً واحدة فلا تحرسه الواجهةُ في كل
    // موضعٍ تقرؤه.
    source: src
      ? {
        kind: SOURCE_BOOK, title: '', author: '', death: '', edition: '',
        url: '', venue: '', date: '', ...src,
      }
      : null,
  }
}

type Row = Record<string, unknown>

const toPerkKind = (r: Row): PerkKindDef => ({
  id: r.id as string,
  name: (r.name as string) ?? '',
  icon: (r.icon as string) ?? '',
  hint: (r.hint as string) ?? '',
})

const toPerkCategory = (r: Row): PerkCategory => ({
  id: r.id as string,
  name: (r.name as string) ?? '',
  parent: (r.parent as string) ?? '',
  icon: (r.icon as string) ?? '',
})

const toPerkFigure = (r: Row): PerkFigure => ({
  id: r.id as string,
  name: (r.name as string) ?? '',
  death: (r.death as string) ?? '',
  note: (r.note as string) ?? '',
  icon: (r.icon as string) ?? '',
})

const toNotebook = (r: Row): Notebook => ({
  id: r.id as string,
  name: (r.name as string) ?? '',
  note: (r.note as string) ?? '',
  icon: (r.icon as string) ?? '',
  layout: (r.layout as Notebook['layout']) ?? [],
  created_at: (r.created_at as string) ?? '',
})

function toSettings(row: Row): Settings {
  // الحقول المستجدّة اختياريّة في المخطّط، فقد يعود المستند القديم بلا بعضها
  return {
    ...DEFAULT_SETTINGS_EXTRAS,
    ...(row as unknown as Settings),
    visibility: { ...DEFAULT_VISIBILITY, ...((row.visibility as object) ?? {}) },
  }
}

/**
 * المكتبةُ كما تقرؤها الواجهة. **والفوائدُ ليست فيها**: تُطلب وحدها متى
 * احتاجتها صفحة (`watchPerks`)، فلا يُحمَّل كنّاشٌ كاملٌ إلى من فتح صفحة
 * الهبوط.
 */
export interface LibrarySnapshot {
  books: Book[]
  authors: Author[]
  works: BookWork[]
  loans: Loan[]
  publishers: Publisher[]
  categories: Category[]
  landingImages: LandingImage[]
  landingQuotes: LandingQuote[]
  settings: Settings
  perkKinds: PerkKindDef[]
  perkCategories: PerkCategory[]
  perkFigures: PerkFigure[]
  notebooks: Notebook[]
}

/** وسيطُ `snapshot` واحدٌ في كل نداء: به يتشارك الرصدُ والطلبُ جوابًا واحدًا */
const SNAPSHOT_ARGS = { withPerks: false }

type SnapshotRow = typeof api.library.snapshot._returnType

function toSnapshot(r: SnapshotRow): LibrarySnapshot {
  const rows = (x: unknown) => x as Row[]
  return {
    books: rows(r.books).map(toBook),
    authors: r.authors as unknown as Author[],
    works: r.works as unknown as BookWork[],
    loans: r.loans as unknown as Loan[],
    publishers: r.publishers as unknown as Publisher[],
    categories: r.categories,
    landingImages: r.landingImages as unknown as LandingImage[],
    landingQuotes: r.landingQuotes as unknown as LandingQuote[],
    settings: toSettings(r.settings as unknown as Row),
    perkKinds: rows(r.perkKinds).map(toPerkKind),
    perkCategories: rows(r.perkCategories).map(toPerkCategory),
    perkFigures: rows(r.perkFigures).map(toPerkFigure),
    notebooks: rows(r.perkNotebooks).map(toNotebook),
  }
}

/**
 * المكتبةُ كلُّها في استعلامٍ واحد (`library.snapshot`).
 *
 * كانت أربعةَ عشرَ استعلامًا عند كل تحميل وبعد كل حفظ، وكلٌّ منها يقرأ جدولَ
 * الكتب في الخادم من أوّله ليعرف ما يظهر منه — فصارت واحدًا يقرؤه مرّةً.
 * والسدُّ ههنا كما كان: `toBook` و`toPerk` وأخواتُهما.
 *
 * وما دام الرصدُ قائمًا (`watchSnapshot`) فهذا الطلبُ يُجاب من نسخته في
 * المتصفّح بلا جولةٍ على الشبكة: Convex يُشرك الطلبَ والرصدَ بوسيطٍ واحد.
 */
export async function fetchSnapshot(): Promise<LibrarySnapshot> {
  return toSnapshot(await convex.query(api.library.snapshot, SNAPSHOT_ARGS))
}

/**
 * **المكتبةُ حيّة**: يُرصد الاستعلامُ فيُبلَّغ بكل تبدُّلٍ فيه، فتتحدّث الصفحاتُ
 * وحدها بعد كل حفظ — من هذا المتصفّح أو من غيره — بلا إعادة تحميلٍ يدويّة.
 * وكانت الواجهةُ تطلب المكتبةَ كلَّها من جديد بعد كل نقرة نجمة.
 *
 * وConvex يضمن أنّ الحفظَ لا يُجاب حتى يصل أثرُه إلى ما يُرصد، فمن حفظ ثم قرأ
 * وجد ما حفظ. ويُعيد الاستعلامَ بنفسه إذا تبدّلت الهويّة — دخل صاحبُ المكتبة
 * أو خرج — فيصل كلٌّ ما يحقّ له.
 */
export function watchSnapshot(
  onData: (snap: LibrarySnapshot) => void,
  onError: (e: unknown) => void,
): () => void {
  return watch(api.library.snapshot, SNAPSHOT_ARGS, (r) => onData(toSnapshot(r)), onError)
}

/** فوائدُ الكنّاش، تُرصد وحدها متى احتاجتها صفحة */
export function watchPerks(
  onData: (perks: Perk[]) => void,
  onError: (e: unknown) => void,
): () => void {
  return watch(api.library.perks, {}, (r) => onData((r as unknown as Row[]).map(toPerk)), onError)
}

/** رصدُ استعلام: يُبلَّغ بجوابه الحاضر إن كان، ثم بكل جوابٍ جديد */
function watch<Q extends FunctionReference<'query'>>(
  query: Q,
  args: Q['_args'],
  onData: (r: Q['_returnType']) => void,
  onError: (e: unknown) => void,
): () => void {
  const w = convex.watchQuery(query, args)
  const emit = () => {
    let result: Q['_returnType'] | undefined
    try {
      result = w.localQueryResult()
    } catch (e) {
      onError(e)
      return
    }
    if (result !== undefined) onData(result)
  }
  const stop = w.onUpdate(emit)
  emit()
  return stop
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

/** الحقلُ الذي يُعدَّل جماعيًّا، واسمُه كما في المستند */
export type BulkField =
  | 'kinds' | 'categories' | 'sub_categories' | 'tags' | 'people' | 'notebook_ids'

/** صفةٌ تُضاف إلى فوائدَ كثيرة أو تُرفع منها دفعةً واحدة */
export async function bulkEditPerks(
  ids: string[], field: BulkField, op: 'add' | 'remove', value: string,
): Promise<void> {
  await convex.mutation(api.catalog.bulkEditPerks, {
    ids: ids as Id<'perks'>[], field, op, value,
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
      id: r.id || undefined, name: r.name, death: r.death, note: r.note, icon: r.icon,
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
  id: string,
  patch: { name?: string; note?: string; icon?: string; layout?: Notebook['layout'] },
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

/** وفاةُ الرجل كما تُكتب من النموذج، وتُحفظ مع اسمه في `ensureAuthors` */
export interface DeathInput {
  death: number | null
  era?: string
  alive: boolean
  approx: boolean
  text: string
}

/**
 * أسماءُ نموذج الكتاب كلُّها في نداءٍ واحد: يُنشأ ما لم يكن، وتُحفظ وفاةُ من
 * كُتبت وفاتُه. والجوابُ على ترتيب الطلب، والنداءُ معاملةٌ واحدة: يقع كلُّه
 * أو لا يقع منه شيء.
 */
export async function ensureAuthors(
  rows: { name: string; death?: DeathInput }[],
): Promise<{ id: string; name: string }[]> {
  if (rows.length === 0) return []
  return await convex.mutation(api.catalog.ensureAuthors, {
    rows: rows.map((r) => ({
      name: r.name,
      death: r.death && {
        death: r.death.death,
        era: (r.death.era as 'هـ' | 'م' | 'ق.هـ' | 'ق.م' | undefined) ?? undefined,
        alive: r.death.alive,
        death_approx: r.death.approx,
        death_text: r.death.text,
      },
    })),
  })
}

/** دُورُ النموذج في نداءٍ واحد، على ترتيب الطلب */
export async function ensurePublishers(
  rows: { name: string; place?: string }[],
): Promise<{ id: string; name: string; place: string }[]> {
  if (rows.length === 0) return []
  return await convex.mutation(api.catalog.ensurePublishers, { rows })
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
export async function uploadImage(folder: string, file: File): Promise<string> {
  // تُصغَّر قبل الرفع: الصورةُ تُرفع مرّةً ويُنزِّلها كلُّ زائر
  const body = await shrinkImage(file, folder)
  const uploadUrl = await convex.mutation(api.images.generateUploadUrl, {})

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': body.type || file.type },
    body,
  })
  if (!res.ok) throw new Error(`تعذّر رفع الصورة (${res.status}).`)

  const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
  const url = await convex.query(api.images.url, { storageId })
  if (!url) throw new Error('رُفعت الصورة ولم يُعرف رابطها.')
  return url
}
