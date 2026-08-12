// المصادقة: مكتبةٌ لمستخدم واحد، فلا تسجيل عام ولا إنشاء حسابات من الواجهة.
//
// profile() يُستدعى في كل مسار (تسجيل دخول، إنشاء حساب، إعادة تعيين)، فرفض أي
// بريد غير بريد صاحب المكتبة هنا يغلق الباب على إنشاء حسابٍ ثانٍ ودخوله معًا.
// اضبط البريد على النشر عبر: npx convex env set OWNER_EMAIL you@example.com

import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'

const OwnerPassword = Password({
  profile(params) {
    const email = String(params.email ?? '').trim().toLowerCase()
    const owner = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()

    if (owner === '') {
      throw new Error('OWNER_EMAIL غير مضبوط على نشر Convex.')
    }
    if (email !== owner) {
      throw new Error('هذا الموقع مخصّص لمستخدم واحد.')
    }

    return { email }
  },
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [OwnerPassword],
})
