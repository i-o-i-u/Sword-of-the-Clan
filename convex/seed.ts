// الزرع الأوّل: ما كان صفوف INSERT في نهاية supabase/schema.sql.
//
// يُنفَّذ مرّةً على نشرٍ فارغ. كل خطوةٍ تتحقّق قبل الإدراج، فتكرار التنفيذ لا
// يُضاعف شيئًا.
//
//   npx convex run seed:run

import { internalMutation } from './_generated/server'
import { DEFAULT_SETTINGS } from './privacy'

const CATEGORIES = [
  'أدب عربي', 'أدب عالمي', 'تاريخ', 'فلسفة', 'علوم', 'سيرة ذاتية',
]

const FIRST_SLIDE_QUOTE =
  'ولولا ما رسمت لنا الأوائل في كتبها، وخلقت من عجيب حكمها ودونت من أنواع سيرها '
  + 'حتى شاهدنا بها ما غاب عنا، وفتحنا بها المستغلق علينا، فجمعنا إلى قليلنا كثيرهم، '
  + 'وأدركنا ما لم نكن ندركه إلا بهم، لقد خس حظنا في الحكمة، وانقطع سبيلنا إلى المعرفة.'

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const done: string[] = []

    if ((await ctx.db.query('shelves').first()) === null) {
      await ctx.db.insert('shelves', { name: 'المكتبة', position: 0 })
      done.push('رفّ')
    }

    if ((await ctx.db.query('categories').first()) === null) {
      for (const [i, name] of CATEGORIES.entries()) {
        await ctx.db.insert('categories', { name, position: i })
      }
      done.push(`${CATEGORIES.length} تصنيفات`)
    }

    if ((await ctx.db.query('library_settings').first()) === null) {
      await ctx.db.insert('library_settings', DEFAULT_SETTINGS)
      done.push('إعدادات')
    }

    if ((await ctx.db.query('landing_slides').first()) === null) {
      await ctx.db.insert('landing_slides', {
        image_url: 'assets/library-cover.jpg',
        quote: FIRST_SLIDE_QUOTE,
        author: 'الجاحظ، «الرسائل» (٤/ ٢٩٧)',
        position: 0,
      })
      done.push('شريحة الهبوط')
    }

    return done.length ? `زُرع: ${done.join('، ')}` : 'لا شيء يُزرع — المكتبة مهيّأة.'
  },
})
