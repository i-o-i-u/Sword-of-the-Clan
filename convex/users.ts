import { getAuthUserId } from '@convex-dev/auth/server'
import { query } from './_generated/server'

/** بيانات المستخدم الحالي — البريد يُعرض في ترويسة الصفحة. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }
    const user = await ctx.db.get(userId)
    return user === null ? null : { email: user.email ?? '' }
  },
})
