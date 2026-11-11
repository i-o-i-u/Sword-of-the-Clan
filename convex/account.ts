// استردادُ كلمة السرّ.
//
// المكتبةُ لمستخدمٍ واحد ولا بريدَ يُرسَل منها، فلا يُبعث رابطُ استرداد. وإنما
// تُعاد كلمةُ السرّ من لوحة Convex (أو من سطر الأوامر) بهذا الإجراء، وهو
// داخليٌّ لا يبلغه متصفِّحٌ بحال — كإجراءات `maintenance.ts`:
//
//   npx convex run --prod account:resetPassword '{"password":"…"}'
//
// والبريدُ هو `OWNER_EMAIL` نفسُه، فلا يُكتب. وتُنهى معه الجلساتُ القائمة: من
// نسي كلمةَ سرّه قد يكون فقدَ جهازًا مفتوحًا عليها.

import { ConvexError, v } from 'convex/values'
import { internalAction } from './_generated/server'
import { invalidateSessions, modifyAccountCredentials, retrieveAccount } from '@convex-dev/auth/server'

const MIN_PASSWORD = 8

export const resetPassword = internalAction({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
    if (!email) throw new ConvexError('OWNER_EMAIL غير مضبوط على نشر Convex.')
    if (password.length < MIN_PASSWORD) {
      throw new ConvexError(`كلمةُ السرّ لا تقلّ عن ${MIN_PASSWORD} أحرف.`)
    }
    const found = await retrieveAccount(ctx, { provider: 'password', account: { id: email } })
    await modifyAccountCredentials(ctx, {
      provider: 'password', account: { id: email, secret: password },
    })
    await invalidateSessions(ctx, { userId: found.user._id })
    return 'تبدّلت كلمةُ السرّ، وأُنهيت الجلساتُ القائمة.'
  },
})
