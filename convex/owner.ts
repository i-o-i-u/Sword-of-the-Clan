// صاحب المكتبة: مستند واحد لا غير.
//
// في Supabase كان هذا سياسةَ إدراجٍ تشترط أن يكون الجدول فارغًا. هنا الشرط
// صريحٌ داخل المُحوِّل، وهو أوضح وأقوى: لا سباق بين طلبين لأن مُحوِّلات Convex
// تُنفَّذ في معاملة.

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

/** هل حُجز حساب صاحب المكتبة بعد؟ يستدعيها الزائر لمعرفة أوّل تشغيل. */
export const ownerExists = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query('library_owner').first()) !== null,
})

/** صفّ صاحب المكتبة إن كان الطالب هو صاحبها، وإلا null. */
export const ownerRecord = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const owner = await ctx.db.query('library_owner').first()
    if (owner === null || owner.user_id !== userId) return null
    return { user_id: owner.user_id as string, display_name: owner.display_name }
  },
})

/** حجز حساب صاحب المكتبة مرّةً واحدة. */
export const claimOwnership = mutation({
  args: { display_name: v.string() },
  handler: async (ctx, { display_name }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('لا جلسة مصادقة.')

    const existing = await ctx.db.query('library_owner').first()
    if (existing !== null) {
      if (existing.user_id === userId) return          // حُجز له من قبل
      throw new Error('للمكتبة صاحبٌ بالفعل.')
    }

    await ctx.db.insert('library_owner', {
      user_id: userId,
      display_name: display_name.trim() || 'صاحب المكتبة',
      claimed_at: Date.now(),
    })
  },
})
