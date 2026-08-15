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
      name: trimmed, full_name: '', birth: null, death: null, era: 'هـ',
      alive: false, death_approx: false, death_text: '', bio: '',
    })
    return toClient((await ctx.db.get(id))!)
  },
})

/**
 * وفاة المؤلِّف تُدخَل من نموذج الكتاب لا من صفحة المؤلِّف وحدها: هي مِلاك
 * ترتيب الكتب، وطلبُها ساعةَ كتابة الاسم أيسر من العودة إليها بعدُ. ولا
 * تُمحى وفاةٌ مثبتة بإدخالٍ فارغ — من نسي ملأها لا يُفسد ما سُجّل.
 */
export const setAuthorDeath = mutation({
  args: {
    id: v.id('authors'),
    death: v.union(v.number(), v.null()),
    era: v.optional(era),
    alive: v.boolean(),
    death_approx: v.boolean(),
    death_text: v.string(),
  },
  handler: async (ctx, { id, death, era: dEra, alive, death_approx, death_text }) => {
    await requireOwner(ctx)
    const author = await ctx.db.get(id)
    if (!author) throw new Error('لا مؤلِّف بهذا المعرّف.')

    if (alive) {
      await ctx.db.patch(id, { alive: true, death: null, death_approx: false, death_text: '' })
      return
    }
    if (death_approx) {
      if (!death_text.trim()) return
      await ctx.db.patch(id, {
        alive: false, death_approx: true, death_text: death_text.trim(), death: null,
      })
      return
    }
    if (death === null) return
    await ctx.db.patch(id, {
      alive: false, death_approx: false, death_text: '', death, era: dEra ?? author.era,
    })
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
      alive: v.optional(v.boolean()),
      death_approx: v.optional(v.boolean()),
      death_text: v.optional(v.string()),
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
      quote_seconds: v.optional(v.number()),
      about_text: v.optional(v.string()),
      x_url: v.optional(v.string()),
      telegram_url: v.optional(v.string()),
      visibility: v.optional(visibility),
      hidden_fields: v.optional(v.array(v.string())),
      hidden_categories: v.optional(v.array(v.string())),
      hidden_book_ids: v.optional(v.array(v.id('books'))),

      show_landing_place: v.optional(v.boolean()),
      show_calculator: v.optional(v.boolean()),
      field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      book_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
      hidden_author_ids: v.optional(v.array(v.string())),
      hidden_author_fields: v.optional(v.array(v.string())),
      author_field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      author_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
      hidden_publisher_ids: v.optional(v.array(v.string())),
      hidden_publisher_fields: v.optional(v.array(v.string())),
      publisher_field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      publisher_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
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
// دُوْر النَّشْر
// ---------------------------------------------------------------------------

/**
 * الدار تُكتب مرةً واحدة: أوّلَ كتابٍ نشرَته يُكتب اسمُها ومكانُها، ثم يُملأ
 * المكان من سجلّها في كل كتابٍ بعده. ولا يُعدَّل المكان من نموذج الكتاب —
 * وإلا اختلف مكانُ الدار الواحدة من كتابٍ إلى كتاب — بل من صفحة دُور النشر.
 */
export const findOrCreatePublisher = mutation({
  args: { name: v.string(), place: v.optional(v.string()) },
  handler: async (ctx, { name, place }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('اسم الدار فارغ.')

    const found = await ctx.db
      .query('publishers')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    // مكانُ الدار المحفوظ لا يُكتب فوقه من نموذج الكتاب، لكنّ الفارغ يُسدّ
    if (found) {
      if (!found.place && place?.trim()) await ctx.db.patch(found._id, { place: place.trim() })
      return toClient((await ctx.db.get(found._id))!)
    }

    const id = await ctx.db.insert('publishers', {
      name: trimmed, place: place?.trim() ?? '', founded: '', website: '', notes: '',
    })
    return toClient((await ctx.db.get(id))!)
  },
})

/**
 * تعديل دار. الاسم والمكان مُكرَّران على كتبها — كما يُكرَّر اسم المؤلِّف —
 * فتُزامَن هنا صراحةً، وإلا بقي على الكتب اسمٌ أو مكانٌ قديم.
 */
export const updatePublisher = mutation({
  args: {
    id: v.id('publishers'),
    patch: v.object({
      name: v.optional(v.string()),
      place: v.optional(v.string()),
      founded: v.optional(v.string()),
      website: v.optional(v.string()),
      notes: v.optional(v.string()),
      logo_url: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    const before = await ctx.db.get(id)
    if (!before) throw new Error('لا دار بهذا المعرّف.')

    await ctx.db.patch(id, patch)

    const renamed = patch.name !== undefined && patch.name !== before.name
    const moved = patch.place !== undefined && patch.place !== before.place
    if (!renamed && !moved) return

    const books = await ctx.db
      .query('books')
      .withIndex('by_publisher', (q) => q.eq('publisher_id', id))
      .collect()
    for (const b of books) {
      await ctx.db.patch(b._id, {
        ...(renamed ? { publisher: patch.name } : {}),
        ...(moved ? { place: patch.place } : {}),
      })
    }
  },
})

/** حذف دار: تُفكّ عن كتبها ويبقى اسمُها مكتوبًا عليها، فلا يضيع خبرُ الطبعة */
export const removePublisher = mutation({
  args: { id: v.id('publishers') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    const books = await ctx.db
      .query('books')
      .withIndex('by_publisher', (q) => q.eq('publisher_id', id))
      .collect()
    for (const b of books) await ctx.db.patch(b._id, { publisher_id: null })
    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// التصنيفات: قائمة أسماء فريدة
// ---------------------------------------------------------------------------

/** `parent` فارغًا: تصنيفٌ رئيس. وباسم رئيسه: فرعٌ تحته. */
export const addCategory = mutation({
  args: { name: v.string(), position: v.number(), parent: v.optional(v.string()) },
  handler: async (ctx, { name, position, parent }) => {
    await requireOwner(ctx)
    const exists = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (exists) return
    await ctx.db.insert('categories', { name, position, parent: parent?.trim() || undefined })
  },
})

/** حذفُ الرئيس يحذف فروعَه معه: الفرعُ لا يقوم بغير رئيسه */
export const removeCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const row = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (!row) return

    if (!row.parent) {
      const children = (await ctx.db.query('categories').collect())
        .filter((c) => c.parent === name)
      for (const child of children) await ctx.db.delete(child._id)
    }
    await ctx.db.delete(row._id)
  },
})

// ---------------------------------------------------------------------------
// صور صفحة الهبوط واقتباساتها — قائمتان مستقلّتان، تدور كلٌّ على مهلها
// ---------------------------------------------------------------------------

export const addLandingImage = mutation({
  args: { position: v.number() },
  handler: async (ctx, { position }) => {
    await requireOwner(ctx)
    await ctx.db.insert('landing_images', { image_url: null, position })
  },
})

export const updateLandingImage = mutation({
  args: {
    id: v.id('landing_images'),
    patch: v.object({
      image_url: v.optional(v.union(v.string(), v.null())),
      position: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

export const removeLandingImage = mutation({
  args: { id: v.id('landing_images') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})

export const addLandingQuote = mutation({
  args: { position: v.number() },
  handler: async (ctx, { position }) => {
    await requireOwner(ctx)
    await ctx.db.insert('landing_quotes', { text: '', author: '', position })
  },
})

export const updateLandingQuote = mutation({
  args: {
    id: v.id('landing_quotes'),
    patch: v.object({
      text: v.optional(v.string()),
      author: v.optional(v.string()),
      position: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

export const removeLandingQuote = mutation({
  args: { id: v.id('landing_quotes') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})
