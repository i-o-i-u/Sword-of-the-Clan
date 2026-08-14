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

const JAHIZ_QUOTE =
  'ولولا ما رسمت لنا الأوائل في كتبها، وخلقت من عجيب حكمها ودونت من أنواع سيرها '
  + 'حتى شاهدنا بها ما غاب عنا، وفتحنا بها المستغلق علينا، فجمعنا إلى قليلنا كثيرهم، '
  + 'وأدركنا ما لم نكن ندركه إلا بهم، لقد خس حظنا في الحكمة، وانقطع سبيلنا إلى المعرفة.'

const JAHIZ_SOURCE = 'الجاحظ، «الرسائل» (٤/ ٢٩٧)'

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const done: string[] = []

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

    // نقل الجدول القديم: كل شريحةٍ كانت صورةً واقتباسًا معًا، فتُقسَم على
    // الجدولين ثم تُحذف. الشرائح الفارغة لا تُنقل.
    const legacy = await ctx.db.query('landing_slides').collect()
    if (legacy.length) {
      let images = (await ctx.db.query('landing_images').collect()).length
      let quotes = (await ctx.db.query('landing_quotes').collect()).length
      for (const slide of legacy.sort((a, b) => a.position - b.position)) {
        if (slide.image_url) {
          await ctx.db.insert('landing_images', {
            image_url: slide.image_url, position: images++,
          })
        }
        if (slide.quote.trim()) {
          await ctx.db.insert('landing_quotes', {
            text: slide.quote, author: slide.author, position: quotes++,
          })
        }
        await ctx.db.delete(slide._id)
      }
      done.push(`نقل ${legacy.length} شريحة قديمة`)
    }

    if ((await ctx.db.query('landing_images').first()) === null) {
      await ctx.db.insert('landing_images', {
        image_url: 'assets/library-cover.jpg', position: 0,
      })
      done.push('صورة الهبوط')
    }

    if ((await ctx.db.query('landing_quotes').first()) === null) {
      await ctx.db.insert('landing_quotes', {
        text: JAHIZ_QUOTE, author: JAHIZ_SOURCE, position: 0,
      })
      done.push('اقتباس الجاحظ')
    }

    return done.length ? `زُرع: ${done.join('، ')}` : 'لا شيء يُزرع — المكتبة مهيّأة.'
  },
})
