import { ConvexError, v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { bookFields } from './constants'

/**
 * استيراد الكتب المُصدَّرة من Supabase ونسبتها إلى صاحب المكتبة.
 *
 * تُنفَّذ مرّة واحدة من الطرفية بعد تسجيل الدخول أوّل مرّة (حتى يوجد المستخدم):
 *   npx convex run migrate:importBooks "$(node scripts/supabase-to-convex.mjs books.json you@example.com)"
 *
 * دالة internal: غير قابلة للاستدعاء من المتصفح، فقط من سطر الأوامر أو من دوال أخرى.
 */
export const importBooks = internalMutation({
  args: {
    ownerEmail: v.string(),
    books: v.array(v.object(bookFields)),
    /** لتكرار الاستيراد عمدًا فوق كتب موجودة. */
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { ownerEmail, books, force }) => {
    const email = ownerEmail.trim().toLowerCase()
    const owner = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .unique()

    if (owner === null) {
      throw new ConvexError(
        `لا يوجد مستخدم بالبريد ${email}. سجّل الدخول إلى الموقع مرّة واحدة أوّلًا ثم أعد المحاولة.`
      )
    }

    const existing = await ctx.db
      .query('books')
      .withIndex('by_owner', (q) => q.eq('ownerId', owner._id))
      .first()

    if (existing !== null && force !== true) {
      throw new ConvexError(
        'توجد كتب في هذه المكتبة أصلًا؛ الاستيراد سيُضاعفها. مرّر force: true إن كنت متأكّدًا.'
      )
    }

    for (const book of books) {
      await ctx.db.insert('books', { ...book, ownerId: owner._id })
    }

    return { inserted: books.length }
  },
})
