// ترحيلاتٌ تُشغَّل مرّةً بيد صاحب المكتبة، لا دوالُّ تُنادى من الواجهة.
//
// موضعُها هنا لا في `catalog.ts`: تلك كتابةٌ يوميّة، وهذه إصلاحُ ما مضى.

import { mutation } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { isOwner } from './privacy'

/**
 * يربط مشارِكي الكتب بسجلّ الأشخاص.
 *
 * `contributor.person_id` اختياريٌّ في المخطّط لأن الكتب المفهرَسة قبله لا
 * تحمله — فبقي مشارِكوها أسماءً بلا سجلّ. و`peopleByRole` في الواجهة يُسقط
 * من لا معرّف له، فكانت صفحةُ «المحقِّقون ونحوهم» تظهر فارغةً وفي المكتبة
 * محقِّقون ومعتنون.
 *
 * فيمرّ هذا على كل مشارِكٍ بلا معرّف، فيبحث عن اسمه في `authors` — وهو سجلّ
 * الأشخاص نفسه — فإن وجده ربطه، وإلّا أنشأ له سجلًّا. والمطابقةُ على الاسم
 * بعد تشذيب أطرافه، فهو المتاح: لا شيء سواه يدلّ على الرجل في المستند القديم.
 *
 * ويُعاد تشغيلُه بلا ضرر: ما رُبط لا يُمَسّ.
 */
export const linkContributors = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isOwner(ctx))) throw new Error('لصاحب المكتبة وحده.')

    // سجلُّ الأشخاص كلُّه مرّةً واحدة، فلا يُقرأ الجدولُ لكل اسم
    const byName = new Map<string, Id<'authors'>>()
    for (const a of await ctx.db.query('authors').collect()) {
      byName.set(a.name.trim(), a._id)
    }

    let linked = 0      // مشارِكٌ رُبط بسجلٍّ قائم أو مستجدّ
    let created = 0     // سجلُّ شخصٍ أُنشئ لأنه لم يكن له سجلّ
    let books = 0       // كتابٌ مُسَّ

    for (const book of await ctx.db.query('books').collect()) {
      const rows = book.contributors ?? []
      if (!rows.some((c) => !c.person_id && c.name.trim())) continue

      const next = []
      for (const c of rows) {
        const name = c.name.trim()
        if (c.person_id || !name) { next.push(c); continue }

        let id = byName.get(name)
        if (!id) {
          // السجلُّ بأدنى ما يلزم، حرفًا بحرفٍ كما في `catalog.findOrCreateAuthor`
          // — فلا يفترق ما يُنشئه الترحيلُ عمّا يُنشئه النموذج. وما سوى
          // الاسم يُكتب من صفحة الرجل.
          id = await ctx.db.insert('authors', {
            name, full_name: '', birth: null, death: null, era: 'هـ',
            alive: false, death_approx: false, death_text: '', bio: '',
          })
          byName.set(name, id)
          created++
        }
        next.push({ ...c, person_id: id })
        linked++
      }

      await ctx.db.patch(book._id, { contributors: next })
      books++
    }

    return { linked, created, books }
  },
})
