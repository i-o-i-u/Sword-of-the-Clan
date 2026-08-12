// المؤلِّفون والفوائد والإعارات والأرفف والتصنيفات والشرائح والإعدادات.
// كلها لصاحب المكتبة وحده.

import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { era, perkKind, visibility } from './schema'
import { DEFAULT_SETTINGS, requireOwner, toClient } from './privacy'

// ---------------------------------------------------------------------------
// المؤلِّفون
// ---------------------------------------------------------------------------

/**
 * يربط الكتاب بمؤلِّفه: إن وُجد الاسم أُلحق به، وإلا أُنشئت له صفحة (§١١/٥).
 * الاسم فريدٌ بعد قصّ الفراغات — كان قيدًا فريدًا في SQL، وصار شرطًا هنا.
 */
export const findOrCreateAuthor = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()

    const found = await ctx.db
      .query('authors')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    if (found) return toClient(found)

    const id = await ctx.db.insert('authors', {
      name: trimmed, full_name: '', birth: null, death: null, era: 'هـ', bio: '',
    })
    return toClient((await ctx.db.get(id))!)
  },
})

/**
 * تعديل مؤلِّف. مزامنة الاسم المُكرَّر على كتبه كانت مُشغِّلًا (trigger) في
 * Postgres — sync_author_name — ولا مثيل له في Convex، فتُكتب هنا. إغفالها
 * يترك على الكتب اسمًا قديمًا فيفسد البحث والترتيب.
 */
export const updateAuthor = mutation({
  args: {
    id: v.id('authors'),
    patch: v.object({
      name: v.optional(v.string()),
      full_name: v.optional(v.string()),
      birth: v.optional(v.union(v.number(), v.null())),
      death: v.optional(v.union(v.number(), v.null())),
      era: v.optional(era),
      bio: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    const before = await ctx.db.get(id)
    if (!before) throw new Error('لا مؤلِّف بهذا المعرّف.')

    await ctx.db.patch(id, patch)

    if (patch.name !== undefined && patch.name !== before.name) {
      const books = await ctx.db
        .query('books')
        .withIndex('by_author', (q) => q.eq('author_id', id))
        .collect()
      for (const b of books) await ctx.db.patch(b._id, { author_name: patch.name })
    }
  },
})

// ---------------------------------------------------------------------------
// الفوائد والمقتطفات
// ---------------------------------------------------------------------------

export const insertPerk = mutation({
  args: {
    book_id: v.id('books'),
    kind: perkKind,
    title: v.string(),
    text: v.string(),
    page: v.string(),
  },
  handler: async (ctx, perk) => {
    await requireOwner(ctx)
    await ctx.db.insert('perks', perk)
  },
})

export const deletePerk = mutation({
  args: { id: v.id('perks') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// الإعارة
// ---------------------------------------------------------------------------

export const insertLoan = mutation({
  args: {
    book_id: v.id('books'),
    borrower: v.string(),
    due_date: v.union(v.string(), v.null()),
  },
  handler: async (ctx, loan) => {
    await requireOwner(ctx)
    await ctx.db.insert('loans', {
      ...loan,
      lent_date: new Date().toISOString().slice(0, 10),   // كان current_date
      returned: false,
    })
  },
})

export const returnLoan = mutation({
  args: { id: v.id('loans') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, { returned: true })
  },
})

// ---------------------------------------------------------------------------
// الإعدادات: مستند واحد، يُنشأ عند أوّل حفظ
// ---------------------------------------------------------------------------

export const updateSettings = mutation({
  args: {
    patch: v.object({
      theme: v.optional(v.union(v.literal('warm'), v.literal('sepia'), v.literal('dark'))),
      font: v.optional(v.union(v.literal('kitab'), v.literal('classic'), v.literal('modern'))),
      ui_scale: v.optional(v.number()),
      show_status_dots: v.optional(v.boolean()),
      show_ratings: v.optional(v.boolean()),
      default_view: v.optional(v.union(v.literal('grid'), v.literal('table'), v.literal('shelf'))),
      currency: v.optional(v.string()),
      landing_title: v.optional(v.string()),
      landing_tagline: v.optional(v.string()),
      landing_intro: v.optional(v.string()),
      show_landing_stats: v.optional(v.boolean()),
      show_landing_quote: v.optional(v.boolean()),
      auto_rotate: v.optional(v.boolean()),
      rotate_seconds: v.optional(v.number()),
      visibility: v.optional(visibility),
      hidden_fields: v.optional(v.array(v.string())),
      hidden_categories: v.optional(v.array(v.string())),
      hidden_book_ids: v.optional(v.array(v.id('books'))),
    }),
  },
  handler: async (ctx, { patch }) => {
    await requireOwner(ctx)
    const row = await ctx.db.query('library_settings').first()
    if (row) await ctx.db.patch(row._id, patch)
    else await ctx.db.insert('library_settings', { ...DEFAULT_SETTINGS, ...patch })
  },
})

// ---------------------------------------------------------------------------
// الأرفف والتصنيفات: قوائم أسماء فريدة
// ---------------------------------------------------------------------------

export const addShelf = mutation({
  args: { name: v.string(), position: v.number() },
  handler: async (ctx, { name, position }) => {
    await requireOwner(ctx)
    const exists = await ctx.db
      .query('shelves').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (exists) return
    await ctx.db.insert('shelves', { name, position })
  },
})

export const removeShelf = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const row = await ctx.db
      .query('shelves').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (row) await ctx.db.delete(row._id)
  },
})

export const addCategory = mutation({
  args: { name: v.string(), position: v.number() },
  handler: async (ctx, { name, position }) => {
    await requireOwner(ctx)
    const exists = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (exists) return
    await ctx.db.insert('categories', { name, position })
  },
})

export const removeCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const row = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (row) await ctx.db.delete(row._id)
  },
})

// ---------------------------------------------------------------------------
// شرائح صفحة الهبوط
// ---------------------------------------------------------------------------

export const addSlide = mutation({
  args: { position: v.number() },
  handler: async (ctx, { position }) => {
    await requireOwner(ctx)
    await ctx.db.insert('landing_slides', {
      image_url: null, quote: '', author: '', position,
    })
  },
})

export const updateSlide = mutation({
  args: {
    id: v.id('landing_slides'),
    patch: v.object({
      image_url: v.optional(v.union(v.string(), v.null())),
      quote: v.optional(v.string()),
      author: v.optional(v.string()),
      position: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

export const removeSlide = mutation({
  args: { id: v.id('landing_slides') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})
