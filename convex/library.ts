// القراءة. لكل دالةٍ مساران:
//   • صاحب المكتبة يقرأ المستندات كما هي.
//   • الزائر يقرأ ما مرّ من privacy.ts، مطابقًا لعروض public_* التي كانت في SQL.
//
// المسار يُحسم من هويّة الطالب في الخادم، لا من وسيطٍ يرسله العميل — فلا يكفي
// أن يدّعي العميل أنه المالك.
//
// **والواجهةُ تقرأ `snapshot` وحدها**: كانت تطلب أربعةَ عشرَ استعلامًا عند كل
// تحميل، وكلٌّ منها يقرأ جدولَ الكتب من أوّله ليعرف الظاهرَ منها — فيُقرأ
// الجدولُ ستَّ مرّاتٍ للزائر الواحد، ويُعاد ذلك كلُّه بعد كل حفظ. فصارت
// القراءةُ دوالَّ تأخذ الكتبَ والإعداداتِ مقروءةً مرّةً واحدة، ويجمعها
// `snapshot` في جوابٍ واحد. وبقيت الاستعلاماتُ المفردة على حالها لمن ناداها
// من نسخةٍ سابقة من الواجهة ما زالت مفتوحةً في متصفّح.

import { query, type QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import {
  authorIsPublic, bookFieldHidden, bookIsPublic, bookPressIds, bookPublisherVisible, isOwner,
  loadSettings, publisherIsPublic, redactAuthor, redactBook, redactPublisher,
  redactSettings, toClient, type Settings,
} from './privacy'

/** ما تحتاجه دوالُّ القراءة كلُّها: هويّةُ الطالب، والإعدادات، والكتب */
interface ReadBase {
  owner: boolean
  s: Settings
  /** الكتبُ الظاهرة للزائر. ولصاحب المكتبة: كلُّها. */
  shown: Doc<'books'>[]
  visibleIds: Set<string>
}

async function readBase(ctx: QueryCtx): Promise<ReadBase> {
  const owner = await isOwner(ctx)
  const s = await loadSettings(ctx)
  const all = await ctx.db.query('books').collect()
  const shown = owner ? all : all.filter((b) => bookIsPublic(b, s))
  return { owner, s, shown, visibleIds: new Set(shown.map((b) => b._id)) }
}

function booksOf({ owner, s, shown, visibleIds }: ReadBase) {
  if (owner) return shown.map(toClient)

  // صلةُ الكتاب بكتابٍ آخر لا تظهر إلا إذا ظهر طرفاها، كما في `works`:
  // «نشرةٌ أخرى من» و«مطبوعٌ ضمن» بابانِ إلى كتابٍ بعينه، فلو بقيا وقد
  // حُجب المُشارُ إليه دلّا عليه ولم يفتحا — والدلالةُ على المحجوب حجبٌ
  // ناقص. ولا يُصنع هذا في `redactBook` لأنها لا تعلم بسائر الكتب.
  return shown.map((b) => {
    const row = redactBook(b, s)
    return {
      ...row,
      edition_of: row.edition_of && visibleIds.has(row.edition_of) ? row.edition_of : null,
      within_book_id:
        row.within_book_id && visibleIds.has(row.within_book_id) ? row.within_book_id : null,
      within_pages:
        row.within_book_id && visibleIds.has(row.within_book_id) ? row.within_pages : '',
      // ومن أُخفي من المؤلِّفين أُخفيت كتبُه، وما طُبع له ضمن غيره من
      // كتبه: فلو بقي العنوانُ مع اسم صاحبه لدلّ على من حُجب.
      within_titles: (row.within_titles ?? []).filter(
        (t) => !t.author_id || !s.hidden_author_ids.includes(t.author_id),
      ),
    }
  })
}

function authorsOf({ owner, s, shown }: ReadBase, all: Doc<'authors'>[]) {
  if (owner) return all.map(toClient)
  if (!s.visibility.authors) return []

  // سجلُّ الأشخاص واحد: فيه المؤلِّف والمحقِّق ومن على صفته. فلا يظهر أحدٌ
  // منهم إلا إذا بقي له في المكتبة كتابٌ ظاهر — ألَّفه أو عمل فيه. ومن
  // أُخفيت كتبُه كلُّها سقط اسمُه معها، إذ لا معنى لعرض من لا كتاب له.
  const visible = new Set<string>()
  for (const b of shown) {
    if (b.author_id) visible.add(b.author_id)
    for (const c of b.co_authors ?? []) if (c.author_id) visible.add(c.author_id)
    // ومن أُخفي حقلُ المشارِكين من كتابه لا يُعرض بسببه: لو عُرض لدلّ على ما
    // حُجب. وكذلك مؤلِّفو العناوين المضمومة وذوو صفاتها إن أُخفيت.
    if (!bookFieldHidden(b, s, 'contributors')) {
      for (const c of b.contributors ?? []) if (c.person_id) visible.add(c.person_id)
    }
    if (!bookFieldHidden(b, s, 'within')) {
      for (const t of b.within_titles ?? []) {
        if (t.author_id) visible.add(t.author_id)
        for (const c of t.contributors ?? []) if (c.person_id) visible.add(c.person_id)
      }
    }
  }
  return all
    .filter((a) => visible.has(a._id) && authorIsPublic(a, s))
    .map((a) => redactAuthor(a, s))
}

function worksOf({ owner, visibleIds }: ReadBase, all: Doc<'book_works'>[]) {
  if (owner) return all.map(toClient)
  // الصلة لا تظهر إلا إذا كان طرفاها ظاهرَين
  return all
    .filter((w) => visibleIds.has(w.book_id) && visibleIds.has(w.target_book_id))
    .map(toClient)
}

function perksOf({ owner, s, visibleIds }: ReadBase, rows: Doc<'perks'>[]) {
  const all = rows.slice().sort((a, b) => a._creationTime - b._creationTime)
  if (owner) return all.map(toClient)
  if (!s.visibility.perks) return []
  // الفائدةُ من كتابٍ ليس في المكتبة لا كتابَ لها يُخفى، فحكمُها حكمُ
  // الباب كلِّه: إن عُرضت الفوائدُ عُرضت معها، وإن حُجبت حُجبت.
  return all
    .filter((p) => p.book_id === null || visibleIds.has(p.book_id))
    .map(toClient)
}

function loansOf({ owner, s, visibleIds }: ReadBase, rows: Doc<'loans'>[]) {
  const all = rows.slice().sort((a, b) => b.lent_date.localeCompare(a.lent_date))
  if (owner) return all.map(toClient)
  if (!s.visibility.loans) return []
  return all.filter((l) => visibleIds.has(l.book_id)).map(toClient)
}

/**
 * دُوْر النَّشْر. تظهر للزائر كما هي: ليست سرًّا، وهي بيانُ الطبعة نفسه.
 * غير أنّ الدار التي كل كتبها مخفيّة لا تُعرَض — وإلا دلّت على كتابٍ محجوب.
 * ومثلُها الدارُ التي أُخفي اسمُها من كتبها كلِّها: لم يبقَ لها عندنا كتابٌ
 * منسوبٌ إليها، فلا معنى لعرضها.
 */
function publishersOf({ owner, s, shown }: ReadBase, rows: Doc<'publishers'>[]) {
  const all = rows.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  if (owner) return all.map(toClient)
  // الدارُ المشارِكة كالأولى: لها من الكتاب نصيبٌ فتُعرض به
  const visible = new Set(
    shown.filter((b) => bookPublisherVisible(b, s)).flatMap((b) => bookPressIds(b)),
  )
  return all
    .filter((p) => visible.has(p._id) && publisherIsPublic(p, s))
    .map((p) => redactPublisher(p, s))
}

/**
 * التصنيفات، رئيسُها وفرعُها. تُعاد صفوفًا لا أسماءً: الفرعُ يحتاج أن يُعرف
 * رئيسُه ليُعرض تحته.
 */
function categoriesOf({ owner, s }: ReadBase, rows: Doc<'categories'>[]) {
  const all = rows.slice().sort((a, b) => a.position - b.position)
    .map((r) => ({ name: r.name, parent: r.parent ?? '' }))
  if (owner) return all
  // إخفاءُ الرئيس يُخفي فروعَه معه: الفرعُ لا يقوم بغير رئيسه
  return all.filter(
    (c) => !s.hidden_categories.includes(c.name)
      && !(c.parent && s.hidden_categories.includes(c.parent)),
  )
}

/**
 * أنواعُ الفوائد وتصنيفاتُها وأعلامُها وكرّاساتُها.
 *
 * أربعةُ جداولٍ حكمُها واحد: هي أثاثُ قسم الفوائد، فإن حُجب القسمُ عن
 * الزائر حُجبت معه — لا معنى لعرض أبوابٍ لا يُعرض ما تحتها. ولا تُرشَّح
 * بغير ذلك: ليس فيها ما يُخفى بعينه.
 */
function perkSide<T extends { _id: unknown; _creationTime: number }>(
  { owner, s }: ReadBase, rows: T[],
): Record<string, unknown>[] {
  if (!owner && !s.visibility.perks) return []
  return rows.map(toClient) as Record<string, unknown>[]
}

const byOrder = <T extends { order?: number; _creationTime: number }>(a: T, b: T) =>
  (a.order ?? 0) - (b.order ?? 0) || a._creationTime - b._creationTime

async function perkKindsOf(ctx: QueryCtx, base: ReadBase) {
  return perkSide(base, (await ctx.db.query('perk_kinds').collect()).sort(byOrder))
}
async function perkCategoriesOf(ctx: QueryCtx, base: ReadBase) {
  return perkSide(base, (await ctx.db.query('perk_categories').collect()).sort(byOrder))
}
async function perkFiguresOf(ctx: QueryCtx, base: ReadBase) {
  return perkSide(base, (await ctx.db.query('perk_figures').collect())
    .sort((a, b) => a.name.localeCompare(b.name, 'ar')))
}
async function perkNotebooksOf(ctx: QueryCtx, base: ReadBase) {
  return perkSide(base, (await ctx.db.query('perk_notebooks').collect())
    .sort((a, b) => a._creationTime - b._creationTime))
}

async function landingImagesOf(ctx: QueryCtx) {
  const all = await ctx.db.query('landing_images').collect()
  return all.sort((a, b) => a.position - b.position).map(toClient)
}

async function landingQuotesOf(ctx: QueryCtx) {
  const all = await ctx.db.query('landing_quotes').collect()
  return all.sort((a, b) => a.position - b.position).map(toClient)
}

/**
 * المكتبةُ كلُّها في جوابٍ واحد: ما يحتاجه أوّلُ رسمٍ وما يُعاد بعد كل حفظ.
 * والكتبُ والإعداداتُ وهويّةُ الطالب تُقرأ مرّةً واحدة ويُبنى عليها الباقي.
 */
export const snapshot = query({
  args: {},
  handler: async (ctx) => {
    const base = await readBase(ctx)
    const [authors, works, perks, loans, publishers, categories] = await Promise.all([
      ctx.db.query('authors').collect(),
      ctx.db.query('book_works').collect(),
      ctx.db.query('perks').collect(),
      ctx.db.query('loans').collect(),
      ctx.db.query('publishers').collect(),
      ctx.db.query('categories').collect(),
    ])
    return {
      books: booksOf(base),
      authors: authorsOf(base, authors),
      works: worksOf(base, works),
      perks: perksOf(base, perks),
      loans: loansOf(base, loans),
      publishers: publishersOf(base, publishers),
      categories: categoriesOf(base, categories),
      landingImages: await landingImagesOf(ctx),
      landingQuotes: await landingQuotesOf(ctx),
      settings: base.owner ? base.s : redactSettings(base.s),
      perkKinds: await perkKindsOf(ctx, base),
      perkCategories: await perkCategoriesOf(ctx, base),
      perkFigures: await perkFiguresOf(ctx, base),
      perkNotebooks: await perkNotebooksOf(ctx, base),
    }
  },
})

// ------------------------------------------------- الاستعلاماتُ المفردة

export const books = query({
  args: {},
  handler: async (ctx) => booksOf(await readBase(ctx)),
})

export const authors = query({
  args: {},
  handler: async (ctx) => authorsOf(await readBase(ctx), await ctx.db.query('authors').collect()),
})

export const works = query({
  args: {},
  handler: async (ctx) => worksOf(await readBase(ctx), await ctx.db.query('book_works').collect()),
})

export const perks = query({
  args: {},
  handler: async (ctx) => perksOf(await readBase(ctx), await ctx.db.query('perks').collect()),
})

export const loans = query({
  args: {},
  handler: async (ctx) => loansOf(await readBase(ctx), await ctx.db.query('loans').collect()),
})

export const publishers = query({
  args: {},
  handler: async (ctx) =>
    publishersOf(await readBase(ctx), await ctx.db.query('publishers').collect()),
})

export const categories = query({
  args: {},
  handler: async (ctx) =>
    categoriesOf(await readBase(ctx), await ctx.db.query('categories').collect()),
})

export const perkKinds = query({
  args: {},
  handler: async (ctx) => perkKindsOf(ctx, await readBase(ctx)),
})

export const perkCategories = query({
  args: {},
  handler: async (ctx) => perkCategoriesOf(ctx, await readBase(ctx)),
})

export const perkFigures = query({
  args: {},
  handler: async (ctx) => perkFiguresOf(ctx, await readBase(ctx)),
})

export const perkNotebooks = query({
  args: {},
  handler: async (ctx) => perkNotebooksOf(ctx, await readBase(ctx)),
})

export const landingImages = query({
  args: {},
  handler: async (ctx) => landingImagesOf(ctx),
})

export const landingQuotes = query({
  args: {},
  handler: async (ctx) => landingQuotesOf(ctx),
})

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const s = await loadSettings(ctx)
    return (await isOwner(ctx)) ? s : redactSettings(s)
  },
})
