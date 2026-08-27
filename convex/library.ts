// القراءة. لكل دالةٍ مساران:
//   • صاحب المكتبة يقرأ المستندات كما هي.
//   • الزائر يقرأ ما مرّ من privacy.ts، مطابقًا لعروض public_* التي كانت في SQL.
//
// المسار يُحسم من هويّة الطالب في الخادم، لا من وسيطٍ يرسله العميل — فلا يكفي
// أن يدّعي العميل أنه المالك.

import { query } from './_generated/server'
import {
  authorIsPublic, bookIsPublic, bookPressIds, bookPublisherVisible, isOwner,
  loadSettings, publisherIsPublic, redactAuthor, redactBook, redactPublisher,
  redactSettings, toClient,
} from './privacy'

export const books = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('books').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    const shown = all.filter((b) => bookIsPublic(b, s))
    const visible = new Set(shown.map((b) => b._id))

    // صلةُ الكتاب بكتابٍ آخر لا تظهر إلا إذا ظهر طرفاها، كما في `works`:
    // «نشرةٌ أخرى من» و«مطبوعٌ ضمن» بابانِ إلى كتابٍ بعينه، فلو بقيا وقد
    // حُجب المُشارُ إليه دلّا عليه ولم يفتحا — والدلالةُ على المحجوب حجبٌ
    // ناقص. ولا يُصنع هذا في `redactBook` لأنها لا تعلم بسائر الكتب.
    return shown.map((b) => {
      const row = redactBook(b, s)
      return {
        ...row,
        edition_of: row.edition_of && visible.has(row.edition_of) ? row.edition_of : null,
        within_book_id:
          row.within_book_id && visible.has(row.within_book_id) ? row.within_book_id : null,
        within_pages:
          row.within_book_id && visible.has(row.within_book_id) ? row.within_pages : '',
      }
    })
  },
})

export const authors = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('authors').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.authors) return []

    // سجلُّ الأشخاص واحد: فيه المؤلِّف والمحقِّق ومن على صفته. فلا يظهر أحدٌ
    // منهم إلا إذا بقي له في المكتبة كتابٌ ظاهر — ألَّفه أو عمل فيه. ومن
    // أُخفيت كتبُه كلُّها سقط اسمُه معها، إذ لا معنى لعرض من لا كتاب له.
    const visible = new Set<string>()
    for (const b of await ctx.db.query('books').collect()) {
      if (!bookIsPublic(b, s)) continue
      if (b.author_id) visible.add(b.author_id)
      for (const c of b.co_authors ?? []) if (c.author_id) visible.add(c.author_id)
      for (const c of b.contributors ?? []) if (c.person_id) visible.add(c.person_id)
    }
    return all
      .filter((a) => visible.has(a._id) && authorIsPublic(a, s))
      .map((a) => redactAuthor(a, s))
  },
})

export const works = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('book_works').collect()
    if (await isOwner(ctx)) return all.map(toClient)

    // الصلة لا تظهر إلا إذا كان طرفاها ظاهرَين
    const s = await loadSettings(ctx)
    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    return all
      .filter((w) => visible.has(w.book_id) && visible.has(w.target_book_id))
      .map(toClient)
  },
})

export const perks = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('perks').collect())
      .sort((a, b) => a._creationTime - b._creationTime)
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.perks) return []

    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    // القيدُ من كتابٍ ليس في المكتبة لا كتابَ له يُخفى، فحكمُه حكمُ الباب
    // كلِّه: إن عُرضت القيودُ عُرض معها، وإن حُجبت حُجب.
    return all
      .filter((p) => p.book_id === null || visible.has(p.book_id))
      .map(toClient)
  },
})

export const loans = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('loans').collect())
      .sort((a, b) => b.lent_date.localeCompare(a.lent_date))
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    if (!s.visibility.loans) return []

    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s))
        .map((b) => b._id),
    )
    return all.filter((l) => visible.has(l.book_id)).map(toClient)
  },
})

/**
 * دُوْر النَّشْر. تظهر للزائر كما هي: ليست سرًّا، وهي بيانُ الطبعة نفسه.
 * غير أنّ الدار التي كل كتبها مخفيّة لا تُعرَض — وإلا دلّت على كتابٍ محجوب.
 * ومثلُها الدارُ التي أُخفي اسمُها من كتبها كلِّها: لم يبقَ لها عندنا كتابٌ
 * منسوبٌ إليها، فلا معنى لعرضها.
 */
export const publishers = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('publishers').collect())
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    if (await isOwner(ctx)) return all.map(toClient)

    const s = await loadSettings(ctx)
    // الدارُ المشارِكة كالأولى: لها من الكتاب نصيبٌ فتُعرض به
    const visible = new Set(
      (await ctx.db.query('books').collect())
        .filter((b) => bookIsPublic(b, s) && bookPublisherVisible(b, s))
        .flatMap((b) => bookPressIds(b)),
    )
    return all
      .filter((p) => visible.has(p._id) && publisherIsPublic(p, s))
      .map((p) => redactPublisher(p, s))
  },
})

/**
 * التصنيفات، رئيسُها وفرعُها. تُعاد صفوفًا لا أسماءً: الفرعُ يحتاج أن يُعرف
 * رئيسُه ليُعرض تحته.
 */
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const all = (await ctx.db.query('categories').collect())
      .sort((a, b) => a.position - b.position)
    const rows = all.map((r) => ({ name: r.name, parent: r.parent ?? '' }))
    if (await isOwner(ctx)) return rows

    const s = await loadSettings(ctx)
    // إخفاءُ الرئيس يُخفي فروعَه معه: الفرعُ لا يقوم بغير رئيسه
    return rows.filter(
      (c) => !s.hidden_categories.includes(c.name)
        && !(c.parent && s.hidden_categories.includes(c.parent)),
    )
  },
})

export const landingImages = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('landing_images').collect()
    return all.sort((a, b) => a.position - b.position).map(toClient)
  },
})

export const landingQuotes = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('landing_quotes').collect()
    return all.sort((a, b) => a.position - b.position).map(toClient)
  },
})

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const s = await loadSettings(ctx)
    return (await isOwner(ctx)) ? s : redactSettings(s)
  },
})
