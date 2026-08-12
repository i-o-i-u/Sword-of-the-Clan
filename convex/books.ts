import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { bookFields } from './constants'

async function requireOwner(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new ConvexError('يلزم تسجيل الدخول.')
  }
  return userId
}

/** يتحقّق أن الكتاب موجود وأنه ملك المستخدم الحالي قبل أي تعديل. */
async function requireOwnedBook(ctx: MutationCtx, id: Id<'books'>) {
  const ownerId = await requireOwner(ctx)
  const book = await ctx.db.get(id)
  if (book === null || book.ownerId !== ownerId) {
    throw new ConvexError('الكتاب غير موجود أو ليس ضمن مكتبتك.')
  }
  return { book, ownerId }
}

/** كتب المستخدم الحالي، الأحدث إضافةً أوّلًا. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return []
    }
    return await ctx.db
      .query('books')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: bookFields,
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx)
    return await ctx.db.insert('books', { ...args, ownerId })
  },
})

export const update = mutation({
  args: { id: v.id('books'), ...bookFields },
  handler: async (ctx, { id, ...fields }) => {
    const { ownerId } = await requireOwnedBook(ctx, id)
    // replace لا patch: الحقول الفارغة تصل من الواجهة محذوفة لا مضبوطة على
    // undefined، فـ patch كان سيُبقي القيمة القديمة عند مسح حقل اختياري.
    await ctx.db.replace(id, { ...fields, ownerId })
  },
})

export const remove = mutation({
  args: { id: v.id('books') },
  handler: async (ctx, { id }) => {
    await requireOwnedBook(ctx, id)
    await ctx.db.delete(id)
  },
})
