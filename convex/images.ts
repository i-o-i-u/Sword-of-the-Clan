// الصور: الأغلفة والكعوب وصور صفحة الهبوط.
//
// في Supabase كان الرفع إلى دلوٍ عامّ بمسارٍ فيه مجلّد. تخزين Convex بلا
// مجلّدات: يُرفع الملف فيُعطى معرّفًا، ثم يُطلب رابطه. لذلك بقي وسيط `folder`
// في الواجهة بلا أثرٍ هنا — أُبقي عليه كي لا تتغيّر مواضع النداء، ولأنه قد
// يعود نافعًا إن أضفنا وسمًا للصور لاحقًا.

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwner } from './privacy'

/** رابط رفعٍ مؤقّت. الرفع لصاحب المكتبة وحده. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/** رابط الصورة بعد الرفع. القراءة للجميع كما كان الدلو عامًّا. */
export const url = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
})
