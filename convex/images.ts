// الصور: الأغلفة والكعوب وصور صفحة الهبوط.
//
// في Supabase كان الرفع إلى دلوٍ عامّ بمسارٍ فيه مجلّد. تخزين Convex بلا
// مجلّدات: يُرفع الملف فيُعطى معرّفًا، ثم يُطلب رابطه. لذلك بقي وسيط `folder`
// في الواجهة بلا أثرٍ هنا — أُبقي عليه كي لا تتغيّر مواضع النداء، ولأنه قد
// يعود نافعًا إن أضفنا وسمًا للصور لاحقًا.

import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { requireOwner } from './privacy'

/** رابط رفعٍ مؤقّت. الرفع لصاحب المكتبة وحده. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * كنسُ الصور اليتيمة: ما رُفع ثم استُبدل أو حُذف صاحبُه يبقى في التخزين أبدًا
 * — يُستبدل الغلافُ فيبقى القديم، ويُحذف الكتابُ فتبقى صورُه — فيتراكم ما
 * لا يُرى ويُحسب على المكتبة. فيمرّ هذا كلَّ يوم (`crons.ts`) على الملفّات
 * المخزونة، ويحذف ما لا يُشير إليه مستندٌ في القاعدة.
 *
 * **ولا يمسّ ما رُفع في يومه**: الصورةُ تُرفع قبل أن يُحفظ نموذجُها، فقد تكون
 * في نموذجٍ مفتوحٍ لم يُحفظ بعد.
 */
export const sweep = internalMutation({
  // أدنى عمرٍ للملفّ قبل أن يُكنس. يومٌ افتراضًا، ويُصغَّر في الاختبار وحده
  // و`dryRun`: يُخبر بما كان سيُحذف ولا يحذف شيئًا
  args: { minAgeMs: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { minAgeMs, dryRun }) => {
    const refs: string[] = []
    for (const b of await ctx.db.query('books').collect()) {
      if (b.cover_url) refs.push(b.cover_url)
      refs.push(...Object.values(b.spine_images ?? {}))
    }
    for (const p of await ctx.db.query('publishers').collect()) {
      if (p.logo_url) refs.push(p.logo_url)
    }
    for (const i of await ctx.db.query('landing_images').collect()) {
      if (i.image_url) refs.push(i.image_url)
    }
    for (const i of await ctx.db.query('landing_slides').collect()) {
      if (i.image_url) refs.push(i.image_url)
    }
    const used = refs.join('\n')

    const dayAgo = Date.now() - (minAgeMs ?? 24 * 3600_000)
    const orphans = []
    let matched = 0
    for (const file of await ctx.db.system.query('_storage').collect()) {
      // يُقارَن برابطه كما يُعطى للواجهة، لا بمعرّفه: الرابطُ يحمل مفتاحًا غيرَ
      // المعرّف، فالمقارنةُ بالمعرّف تحسب الصورةَ المستعملة يتيمةً فتحذفها
      const url = await ctx.storage.getUrl(file._id)
      if (!url) continue
      const key = url.split('/').pop() ?? url
      if (used.includes(key)) { matched++; continue }
      if (file._creationTime > dayAgo) continue
      orphans.push(file._id)
    }

    // صمّامُ أمان: في القاعدة روابطُ إلى التخزين ولم يُطابَق منها ملفٌّ واحد —
    // فالعِلّةُ في المطابقة لا في الصور، ولا يُحذف شيء
    const stored = refs.filter((r) => r.includes('/api/storage/')).length
    if (stored > 0 && matched === 0) return { removed: 0, aborted: true }

    if (dryRun) return { removed: 0, aborted: false, wouldRemove: orphans.length, matched }
    for (const id of orphans) await ctx.storage.delete(id)
    return { removed: orphans.length, aborted: false }
  },
})

/** رابط الصورة بعد الرفع. القراءة للجميع كما كان الدلو عامًّا. */
export const url = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => await ctx.storage.getUrl(storageId),
})
