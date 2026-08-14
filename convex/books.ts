// الكتب: إضافة وتعديل وحذف، والصلات بينها. لصاحب المكتبة وحده.
//
// ما كانت Postgres تفعله تلقائيًّا ولا مثيل له هنا فيُكتب صراحةً:
//   • الحذف المتسلسل (on delete cascade) — يُنفَّذ يدويًّا في deleteBook.
//   • قيد book_works الفريد ومنع ربط الكتاب بنفسه.
//
// ملاحظة على patch: كل حقول الكتاب مطلوبة في المخطّط وتُمسح بقيمةٍ صريحة
// ('' أو null) لا بـ undefined، فلا يسقط شيء في النقل، وpatch آمن هنا.

import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { coAuthor, contributor, era, readingStatus } from './schema'
import { requireOwner, toClient } from './privacy'
import type { Doc } from './_generated/dataModel'

/** حقول الكتاب كلها اختيارية عند الإدخال — ما نقص يأخذ قيمته الافتراضية */
const bookInput = {
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  author_id: v.optional(v.union(v.id('authors'), v.null())),
  author_name: v.optional(v.string()),
  co_authors: v.optional(v.array(coAuthor)),
  contributors: v.optional(v.array(contributor)),
  series: v.optional(v.string()),
  series_no: v.optional(v.string()),
  category: v.optional(v.string()),
  publisher_id: v.optional(v.union(v.id('publishers'), v.null())),
  publisher: v.optional(v.string()),
  place: v.optional(v.string()),
  year: v.optional(v.union(v.number(), v.null())),
  year_month: v.optional(v.union(v.number(), v.null())),
  year_era: v.optional(era),
  year_approx: v.optional(v.boolean()),
  year_text: v.optional(v.string()),
  edition: v.optional(v.string()),
  edition_worded: v.optional(v.boolean()),
  edition_notes: v.optional(v.string()),
  parts: v.optional(v.union(v.number(), v.null())),
  single_part: v.optional(v.boolean()),
  volumes: v.optional(v.union(v.number(), v.null())),
  single_volume: v.optional(v.boolean()),
  volume_pages: v.optional(v.array(v.union(v.number(), v.string()))),
  pages: v.optional(v.union(v.number(), v.null())),
  size: v.optional(v.string()),
  isbn: v.optional(v.string()),
  language: v.optional(v.string()),
  language_original: v.optional(v.string()),
  cabinet_no: v.optional(v.string()),
  shelf_no: v.optional(v.string()),
  binding: v.optional(v.string()),
  condition: v.optional(v.string()),
  source: v.optional(v.string()),
  source_detail: v.optional(v.string()),
  acquired_month: v.optional(v.union(v.number(), v.null())),
  acquired_year: v.optional(v.union(v.number(), v.null())),
  acquired_approx: v.optional(v.boolean()),
  acquired_text: v.optional(v.string()),
  margin_note: v.optional(v.string()),
  value: v.optional(v.union(v.number(), v.null())),
  topic: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  blurb: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.optional(readingStatus),
  rating: v.optional(v.number()),
  cover_url: v.optional(v.union(v.string(), v.null())),
  spine_images: v.optional(v.record(v.string(), v.string())),
  use_spine: v.optional(v.boolean()),
}

type BookInput = Partial<Doc<'books'>>

/** الافتراضيّات، نقلًا عن DEFAULT في supabase/schema.sql */
function withDefaults(input: BookInput) {
  return {
    title: input.title ?? '',
    subtitle: input.subtitle ?? '',
    author_id: input.author_id ?? null,
    author_name: input.author_name ?? '',
    co_authors: input.co_authors ?? [],
    contributors: input.contributors ?? [],
    series: input.series ?? '',
    series_no: input.series_no ?? '',
    category: input.category ?? '',
    publisher_id: input.publisher_id ?? null,
    publisher: input.publisher ?? '',
    place: input.place ?? '',
    year: input.year ?? null,
    year_month: input.year_month ?? null,
    year_era: input.year_era ?? 'هـ',
    year_approx: input.year_approx ?? false,
    year_text: input.year_text ?? '',
    edition: input.edition ?? '',
    edition_worded: input.edition_worded ?? false,
    edition_notes: input.edition_notes ?? '',
    parts: input.parts ?? null,
    single_part: input.single_part ?? false,
    volumes: input.volumes ?? null,
    single_volume: input.single_volume ?? false,
    volume_pages: input.volume_pages ?? [],
    pages: input.pages ?? null,
    size: input.size ?? '',
    isbn: input.isbn ?? '',
    language: input.language ?? 'العربية',
    language_original: input.language_original ?? '',
    cabinet_no: input.cabinet_no ?? '',
    shelf_no: input.shelf_no ?? '',
    binding: input.binding ?? '',
    condition: input.condition ?? '',
    source: input.source ?? '',
    source_detail: input.source_detail ?? '',
    acquired_month: input.acquired_month ?? null,
    acquired_year: input.acquired_year ?? null,
    acquired_approx: input.acquired_approx ?? false,
    acquired_text: input.acquired_text ?? '',
    margin_note: input.margin_note ?? '',
    value: input.value ?? 0,
    topic: input.topic ?? '',
    tags: input.tags ?? [],
    blurb: input.blurb ?? '',
    notes: input.notes ?? '',
    status: input.status ?? ('لم تُقرأ' as const),
    rating: input.rating ?? 0,
    cover_url: input.cover_url ?? null,
    spine_images: input.spine_images ?? {},
    use_spine: input.use_spine ?? false,
  }
}

export const insert = mutation({
  args: bookInput,
  handler: async (ctx, input) => {
    await requireOwner(ctx)
    const id = await ctx.db.insert('books', withDefaults(input as BookInput))
    return toClient((await ctx.db.get(id))!)
  },
})

export const update = mutation({
  args: { id: v.id('books'), patch: v.object(bookInput) },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch as BookInput)
  },
})

/**
 * الحذف المتسلسل: كان `on delete cascade` في SQL يتكفّل بالصلات والفوائد
 * والإعارات. لا مثيل له في Convex، فنُنظّف يدويًّا وإلا بقيت مستنداتٌ يتيمة
 * تشير إلى كتابٍ لا وجود له.
 */
export const remove = mutation({
  args: { id: v.id('books') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)

    const works = [
      ...(await ctx.db.query('book_works').withIndex('by_book', (q) => q.eq('book_id', id)).collect()),
      ...(await ctx.db.query('book_works').withIndex('by_target', (q) => q.eq('target_book_id', id)).collect()),
    ]
    const perks = await ctx.db.query('perks').withIndex('by_book', (q) => q.eq('book_id', id)).collect()
    const loans = await ctx.db.query('loans').withIndex('by_book', (q) => q.eq('book_id', id)).collect()

    for (const doc of [...works, ...perks, ...loans]) await ctx.db.delete(doc._id)

    // وأزِله من قائمة المخفيّ في الإعدادات حتى لا تتراكم فيها معرّفاتٌ ميّتة
    const settings = await ctx.db.query('library_settings').first()
    if (settings && settings.hidden_book_ids.includes(id)) {
      await ctx.db.patch(settings._id, {
        hidden_book_ids: settings.hidden_book_ids.filter((b) => b !== id),
      })
    }

    await ctx.db.delete(id)
  },
})

/** يربط كتابًا بكتاب: «شرحٌ على…»، «حاشيةٌ على…». */
export const insertWorks = mutation({
  args: {
    book_id: v.id('books'),
    works: v.array(v.object({ target_book_id: v.id('books'), type: v.string() })),
  },
  handler: async (ctx, { book_id, works }) => {
    await requireOwner(ctx)
    if (works.length === 0) return

    const existing = await ctx.db
      .query('book_works')
      .withIndex('by_book', (q) => q.eq('book_id', book_id))
      .collect()

    for (const w of works) {
      if (w.target_book_id === book_id) continue              // لا يُربط الكتاب بنفسه
      const duplicate = existing.some(
        (e) => e.target_book_id === w.target_book_id && e.type === w.type,
      )
      if (duplicate) continue                                  // القيد الفريد في SQL
      await ctx.db.insert('book_works', { book_id, ...w })
    }
  },
})

/** يفكّ صلةً بين كتابين. التعديل يحتاجه: صلةٌ أُخطئ فيها لا تبقى أبدًا. */
export const removeWork = mutation({
  args: { id: v.id('book_works') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})
