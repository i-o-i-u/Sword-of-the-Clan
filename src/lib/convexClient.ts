import { ConvexReactClient } from 'convex/react'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!url) {
  throw new Error(
    'VITE_CONVEX_URL غير مضبوط. انسخ .env.example إلى .env وضع فيه رابط نشر Convex.',
  )
}

// عميل واحد للتطبيق كله. ConvexAuthProvider يضبط عليه هويّة الجلسة، فتمرّ
// نداءات api.ts مصادَقةً وإن لم تُكتب داخل مكوِّن React.
export const convex = new ConvexReactClient(url)
