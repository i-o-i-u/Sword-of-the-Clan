// القراءة. لكل دالةٍ مساران:
//   • صاحب المكتبة يقرأ المستندات كما هي.
//   • الزائر يقرأ ما مرّ من privacy.ts، مطابقًا لعروض public_* التي كانت في SQL.
//
// المسار يُحسم من هويّة الطالب في الخادم، لا من وسيطٍ يرسله العميل — فلا يكفي
// أن يدّعي العميل أنه المالك.

import { query } from './_generated/server'
import {
  bookIsPublic, isOwner, loadSettings, redactBook, redactSettings, toClient,
} from './privacy'

export const books = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('books').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    return all.filter((b) => bookIsPublic(b, s)).map((b) => redactBook(b, s))
  },
})

export const authors = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('authors').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.authors) return []

    // لا يظهر مؤلِّفٌ إلا إذا كان له كتابٌ ظاهر
    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b.author_id)
        .filter((id): id is NonNullable<typeof id> => id !== null),
    )
    return all.filter((a) => visible.has(a._id)).map(toClient)
  },
})

export const works = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('book_works').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    // الصلة لا تظهر إلا إذا كان طرفاها ظاهرَين
    const s = await loadSettings(ctx)
    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    return all
      .filter((w) => visible.has(w.book_id) && visible.has(w.target_book_id))
      .map(toClient)
  },
})

export const perks = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('perks').collect())
      .sort((a, b) => a._creationTime - b._creationTime)
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.perks) return []

    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    return all.filter((p) => visible.has(p.book_id)).map(toClient)
  },
})

export const loans = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('loans').collect())
      .sort((a, b) => b.lent_date.localeCompare(a.lent_date))
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.loans) return []

    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    return all.filter((l) => visible.has(l.book_id)).map(toClient)
  },
})

export const shelves = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('shelves').collect()
    return all.sort((a, b) => a.position - b.position).map((r) => r.name)
  },
})

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('categories').collect())
      .sort((a, b) => a.position - b.position)
    if (await isOwner(ctx)) return all.map((r) => r.name)

    const s = await loadSettings(ctx)
    return all.filter((c) => !s.hidden_categories.includes(c.name)).map((r) => r.name)
  },
})

export const landingImages = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('landing_images').collect()
    return all.sort((a, b) => a.position - b.position).map(toClient)
  },
})

export const landingQuotes = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('landing_quotes').collect()
    return all.sort((a, b) => a.position - b.position).map(toClient)
  },
})

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const s = await loadSettings(ctx)
    return (await isOwner(ctx)) ? s : redactSettings(s)
  },
})
