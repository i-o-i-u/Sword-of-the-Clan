// ترحيلاتٌ تُشغَّل مرّةً بيد صاحب المكتبة، لا دوالُّ تُنادى من الواجهة.
//
// موضعُها هنا لا في `catalog.ts`: تلك كتابةٌ يوميّة، وهذه إصلاحُ ما مضى.

import { internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'

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
 *
 * وهو `internalMutation` لا `mutation`: الداخليّةُ ليست في واجهة API فلا
 * يبلغها متصفِّحٌ بحال، فهي أحرزُ من حارس `isOwner`. ولوحةُ Convex تُشغِّلها،
 * وهي تنادي الدوالَّ بلا هويّةِ جلسة — فحارسُ الملكية كان سيردُّ صاحبَ
 * المكتبة نفسه.
 */
export const linkContributors = internalMutation({
  args: {},
  handler: async (ctx) => {
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

/**
 * يطوي الكتبَ المضمومة في ضامِّها.
 *
 * كان الكتابُ المطبوع ضمن غيره سجلًّا قائمًا برأسه يشير إلى ضامِّه
 * بـ`within_book_id`، فيُطالَب فاهرسُه ببيانات طبعةٍ ونسخةٍ هي بيانات
 * الضامّ نفسِها، ويُعرَض في الشبكة والأرفف كأنه كتابٌ على الرفّ مستقلّ —
 * وليس كذلك: هو عنوانٌ في كتابٍ واحد. فصار خبرًا في الضامّ نفسِه
 * (`within_titles`)، لا يُكتب فيه إلا ما ينفرد به.
 *
 * فهذا ينقل كلَّ سجلٍّ مضمومٍ إلى قائمة ضامِّه ثم **يحذف السجلّ**، وينقل
 * معه ما تعلَّق به من فوائدَ وإعاراتٍ وصلاتٍ إلى الضامّ — لا تضيع فائدةٌ
 * قُيِّدت على كتابٍ مضموم.
 *
 * ويُعاد تشغيلُه بلا ضرر: ما لا `within_book_id` له لا يُمَسّ.
 */
export const foldWithinBooks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('books').collect()
    const children = all.filter((b) => b.within_book_id)

    let folded = 0      // سجلٌّ طُوي في ضامِّه ثم حُذف
    let orphans = 0     // سجلٌّ يشير إلى ضامٍّ لا وجود له، فتُرك على حاله
    let moved = 0       // فائدةٌ أو إعارةٌ أو صلةٌ نُقلت إلى الضامّ

    for (const child of children) {
      const parentId = child.within_book_id!
      const parent = await ctx.db.get(parentId)
      if (!parent) { orphans++; continue }

      const titles = parent.within_titles ?? []
      if (!titles.some((t) => t.title.trim() === child.title.trim())) {
        titles.push({
          title: child.title,
          author_id: child.author_id,
          author_name: child.author_name,
          contributors: child.contributors ?? [],
          category: child.category ?? '',
          sub_category: child.sub_category ?? '',
          is_matn: child.is_matn ?? false,
          at: child.within_pages ?? '',
        })
        await ctx.db.patch(parentId, { within_titles: titles })
      }

      // ما تعلَّق بالسجلّ المضموم يُنقل إلى ضامِّه لا يُحذف معه
      for (const perk of await ctx.db.query('perks')
        .withIndex('by_book', (q) => q.eq('book_id', child._id)).collect()) {
        await ctx.db.patch(perk._id, { book_id: parentId })
        moved++
      }
      for (const loan of await ctx.db.query('loans')
        .withIndex('by_book', (q) => q.eq('book_id', child._id)).collect()) {
        await ctx.db.patch(loan._id, { book_id: parentId })
        moved++
      }
      for (const w of await ctx.db.query('book_works')
        .withIndex('by_book', (q) => q.eq('book_id', child._id)).collect()) {
        await ctx.db.patch(w._id, { book_id: parentId })
        moved++
      }
      for (const w of await ctx.db.query('book_works')
        .withIndex('by_target', (q) => q.eq('target_book_id', child._id)).collect()) {
        await ctx.db.patch(w._id, { target_book_id: parentId })
        moved++
      }

      // ونشرةٌ نُسبت إلى المضموم تُنسَب إلى ضامِّه، فلا تبقى معلَّقةً بمحذوف
      for (const b of all) {
        if (b.edition_of === child._id) await ctx.db.patch(b._id, { edition_of: parentId })
      }

      await ctx.db.delete(child._id)
      folded++
    }

    return { folded, orphans, moved }
  },
})
