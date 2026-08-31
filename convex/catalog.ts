// المؤلِّفون والفوائد والإعارات والأرفف والتصنيفات والشرائح والإعدادات.
// كلها لصاحب المكتبة وحده.

import { v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import { era, perkSource, visibility } from './schema'
import { DEFAULT_SETTINGS, requireOwner, toClient } from './privacy'

// ---------------------------------------------------------------------------
// المؤلِّفون
// ---------------------------------------------------------------------------

/**
 * يربط الكتاب بمؤلِّفه: إن وُجد الاسم أُلحق به، وإلا أُنشئت له صفحة (§١١/٥).
 * الاسم فريدٌ بعد قصّ الفراغات — كان قيدًا فريدًا في SQL، وصار شرطًا هنا.
 */
export const findOrCreateAuthor = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()

    const found = await ctx.db
      .query('authors')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    if (found) return toClient(found)

    const id = await ctx.db.insert('authors', {
      name: trimmed, full_name: '', birth: null, death: null, era: 'هـ',
      alive: false, death_approx: false, death_text: '', bio: '',
    })
    return toClient((await ctx.db.get(id))!)
  },
})

/**
 * وفاة المؤلِّف تُدخَل من نموذج الكتاب لا من صفحة المؤلِّف وحدها: هي مِلاك
 * ترتيب الكتب، وطلبُها ساعةَ كتابة الاسم أيسر من العودة إليها بعدُ. ولا
 * تُمحى وفاةٌ مثبتة بإدخالٍ فارغ — من نسي ملأها لا يُفسد ما سُجّل.
 */
export const setAuthorDeath = mutation({
  args: {
    id: v.id('authors'),
    death: v.union(v.number(), v.null()),
    era: v.optional(era),
    alive: v.boolean(),
    death_approx: v.boolean(),
    death_text: v.string(),
  },
  handler: async (ctx, { id, death, era: dEra, alive, death_approx, death_text }) => {
    await requireOwner(ctx)
    const author = await ctx.db.get(id)
    if (!author) throw new Error('لا مؤلِّف بهذا المعرّف.')

    if (alive) {
      await ctx.db.patch(id, { alive: true, death: null, death_approx: false, death_text: '' })
      return
    }
    if (death_approx) {
      if (!death_text.trim()) return
      await ctx.db.patch(id, {
        alive: false, death_approx: true, death_text: death_text.trim(), death: null,
      })
      return
    }
    if (death === null) return
    await ctx.db.patch(id, {
      alive: false, death_approx: false, death_text: '', death, era: dEra ?? author.era,
    })
  },
})

/**
 * تعديل مؤلِّف. مزامنة الاسم المُكرَّر على كتبه كانت مُشغِّلًا (trigger) في
 * Postgres — sync_author_name — ولا مثيل له في Convex، فتُكتب هنا. إغفالها
 * يترك على الكتب اسمًا قديمًا فيفسد البحث والترتيب.
 */
export const updateAuthor = mutation({
  args: {
    id: v.id('authors'),
    patch: v.object({
      name: v.optional(v.string()),
      full_name: v.optional(v.string()),
      birth: v.optional(v.union(v.number(), v.null())),
      death: v.optional(v.union(v.number(), v.null())),
      era: v.optional(era),
      alive: v.optional(v.boolean()),
      death_approx: v.optional(v.boolean()),
      death_text: v.optional(v.string()),
      bio: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    const before = await ctx.db.get(id)
    if (!before) throw new Error('لا مؤلِّف بهذا المعرّف.')

    await ctx.db.patch(id, patch)

    if (patch.name !== undefined && patch.name !== before.name) {
      const name = patch.name
      const books = await ctx.db
        .query('books')
        .withIndex('by_author', (q) => q.eq('author_id', id))
        .collect()
      for (const b of books) await ctx.db.patch(b._id, { author_name: name })

      // ومؤلِّفُ العنوان المضموم مؤلِّفٌ كصاحب السجلّ، واسمُه مُكرَّرٌ في
      // ضامِّه — فلو أُغفل بقي على الكتاب اسمٌ قديم، كما يبقى على كتب الدار
      // إن أُغفلت مزامنتُها. ولا فهرسَ يبلغه، فالمرورُ على الكتب كلِّها.
      for (const b of await ctx.db.query('books').collect()) {
        const titles = b.within_titles ?? []
        if (!titles.some((t) => t.author_id === id && t.author_name !== name)) continue
        await ctx.db.patch(b._id, {
          within_titles: titles.map(
            (t) => (t.author_id === id ? { ...t, author_name: name } : t),
          ),
        })
      }
    }
  },
})

// ---------------------------------------------------------------------------
// الفوائد والمقتطفات
// ---------------------------------------------------------------------------

/**
 * حقول الفائدة. مُصدَّرة ليقرأها الإدخالُ والتعديل جميعًا، فلا يُكتب الحقلُ
 * مرَّتين ويُنسى في إحداهما.
 *
 * والكتابُ يجوز أن يكون فارغًا: الفائدةُ قد تكون من كتابٍ ليس في المكتبة،
 * فيُكتب مصدرُها في `source` نصًّا.
 */
const perkFields = {
  book_id: v.union(v.id('books'), v.null()),
  /** أنواعُها. قائمةٌ لا حقل: الفائدةُ تكون تحريرًا وتعقُّبًا معًا. */
  kinds: v.optional(v.array(v.string())),
  title: v.string(),
  /** النصُّ مجرَّدًا، عليه يقوم البحثُ والعزوُ ومختصرُ البطاقة */
  text: v.string(),
  /** والنصُّ منسَّقًا كما كُتب في المُحرِّر */
  text_html: v.optional(v.string()),
  footnotes: v.optional(v.array(v.object({ id: v.string(), text: v.string() }))),
  page: v.string(),
  volume: v.optional(v.string()),
  /** تصنيفاتُها وفروعُها، وهي أبوابُ الفوائد لا تصنيفاتُ المكتبة */
  categories: v.optional(v.array(v.string())),
  sub_categories: v.optional(v.array(v.string())),
  tags: v.optional(v.array(v.string())),
  people: v.optional(v.array(v.string())),
  comment: v.optional(v.string()),
  source: v.optional(perkSource),
}

export const insertPerk = mutation({
  args: perkFields,
  handler: async (ctx, perk) => {
    await requireOwner(ctx)
    return await ctx.db.insert('perks', perk)
  },
})

/**
 * تعديلُ الفائدة. وكانت تُحذف ويُعاد كتابتُها إذ لم يكن لها تعديل، فيضيع
 * تاريخُ تقييدها — و`_creationTime` هو الذي يُبنى عليه ترتيبُ «آخر ما قُيِّد».
 *
 * ونفاستُها وكرّاساتُها ليستا من حقول النموذج: تلك تُعلَّم من صفحة الفائدة،
 * وهذه تُضاف من صفحة الكرّاسة — ولكلٍّ مُحوِّلُه، فلا يمحو حفظُ النموذج ما
 * لم يُسأل عنه فيه.
 */
export const updatePerk = mutation({
  args: { id: v.id('perks'), patch: v.object(perkFields) },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

/** نفاسةُ الفائدة: تُعلَّم من صفحتها بعد قيدها، لا من نموذجها */
export const setPerkRating = mutation({
  args: { id: v.id('perks'), rating: v.number() },
  handler: async (ctx, { id, rating }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, { rating: Math.max(0, Math.min(3, Math.round(rating))) })
  },
})

/** كرّاساتُ الفائدة: تُضاف إليها من صفحة الكرّاسة، وتُرفع منها */
export const setPerkNotebooks = mutation({
  args: { id: v.id('perks'), notebook_ids: v.array(v.string()) },
  handler: async (ctx, { id, notebook_ids }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, { notebook_ids: [...new Set(notebook_ids)] })
  },
})

export const deletePerk = mutation({
  args: { id: v.id('perks') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// أثاثُ قسم الفوائد: الأنواع والتصنيفات والأعلام والكرّاسات
// ---------------------------------------------------------------------------

/**
 * مزامنةُ اسمٍ تبدّل على ما نُسب إليه من فوائد.
 *
 * وهذا ما كانت Postgres تفعله بمفتاحٍ أجنبيّ ونحن نكتبه صراحةً — كما
 * يُزامَن اسمُ المؤلِّف على كتبه. وإغفالُه يترك فوائدَ موسومةً بنوعٍ أو
 * تصنيفٍ لا وجود له، فلا تُصفَّى به ولا يُعرف بابُها.
 */
async function syncRename(
  ctx: MutationCtx,
  field: 'kinds' | 'categories' | 'sub_categories' | 'people',
  from: string,
  to: string,
) {
  if (!from || !to || from === to) return
  for (const p of await ctx.db.query('perks').collect()) {
    const list = p[field] ?? []
    if (!list.includes(from)) continue
    await ctx.db.patch(p._id, {
      [field]: [...new Set(list.map((x) => (x === from ? to : x)))],
    })
  }
}

/**
 * رفعُ اسمٍ حُذف صفُّه من كل فائدةٍ نُسبت إليه.
 *
 * **ولا تُحذف الفائدة**: التصنيفُ صفةٌ لها لا وعاءٌ يحويها. وإغفالُ هذا هو
 * الذي كان يُظهر أنّ الحذف لم يقع: الاسمُ يبقى في الفوائد، فتُعيده
 * `perkKindsOf` و`perkTopics` إلى القوائم كي لا تسقط فائدةٌ من العرض —
 * فيُرى المحذوفُ قائمًا.
 */
async function syncDrop(
  ctx: MutationCtx,
  field: 'kinds' | 'categories' | 'sub_categories' | 'people',
  names: string[],
) {
  const gone = names.filter(Boolean)
  if (!gone.length) return
  for (const p of await ctx.db.query('perks').collect()) {
    const list = p[field] ?? []
    if (!list.some((x) => gone.includes(x))) continue
    await ctx.db.patch(p._id, { [field]: list.filter((x) => !gone.includes(x)) })
  }
}

/**
 * حفظُ قائمةٍ من قوائم القسم دفعةً واحدة: ما زاد يُنشأ، وما نقص يُحذف، وما
 * تبدّل اسمُه يُعدَّل ويُزامَن اسمُه الجديد على فوائده.
 *
 * والصفُّ المحفوظ يحمل معرّفَه إن كان قائمًا، فيُعرف أنّ الاسمَ تبدّل ولم
 * يُحذف صفٌّ ويُنشأ آخر — ولو عُرف بالاسم وحده لضاعت نسبةُ الفوائد بأوّل
 * تصحيحٍ إملائيّ.
 */
const kindRow = v.object({
  id: v.optional(v.string()),
  name: v.string(),
  icon: v.optional(v.string()),
  hint: v.optional(v.string()),
})

export const savePerkKinds = mutation({
  args: { rows: v.array(kindRow) },
  handler: async (ctx, { rows }) => {
    await requireOwner(ctx)
    const old = await ctx.db.query('perk_kinds').collect()
    const kept = new Set<string>()

    for (const [i, row] of rows.entries()) {
      const name = row.name.trim()
      if (!name) continue
      const doc = old.find((o) => o._id === row.id)
      if (doc) {
        kept.add(doc._id)
        if (doc.name !== name) await syncRename(ctx, 'kinds', doc.name, name)
        await ctx.db.patch(doc._id, {
          name, icon: row.icon ?? '', hint: row.hint ?? '', order: i,
        })
      } else {
        kept.add(await ctx.db.insert('perk_kinds', {
          name, icon: row.icon ?? '', hint: row.hint ?? '', order: i,
        }))
      }
    }
    const gone = old.filter((o) => !kept.has(o._id))
    await syncDrop(ctx, 'kinds', gone.map((o) => o.name))
    for (const doc of gone) await ctx.db.delete(doc._id)
  },
})

const categoryRow = v.object({
  id: v.optional(v.string()),
  name: v.string(),
  parent: v.optional(v.string()),
  icon: v.optional(v.string()),
})

export const savePerkCategories = mutation({
  args: { rows: v.array(categoryRow) },
  handler: async (ctx, { rows }) => {
    await requireOwner(ctx)
    const old = await ctx.db.query('perk_categories').collect()
    const kept = new Set<string>()

    for (const [i, row] of rows.entries()) {
      const name = row.name.trim()
      if (!name) continue
      const parent = (row.parent ?? '').trim()
      const doc = old.find((o) => o._id === row.id)
      if (doc) {
        kept.add(doc._id)
        const wasSub = !!(doc.parent ?? '')
        const isSub = !!parent

        if (doc.name !== name) {
          await syncRename(ctx, wasSub ? 'sub_categories' : 'categories', doc.name, name)
          // واسمُ الرئيس مكتوبٌ في فروعه أيضًا، فيُنقل إليها — وإلّا صار
          // الفرعُ يتيمًا لا رئيسَ له
          if (!wasSub) {
            for (const kid of old) {
              if ((kid.parent ?? '') === doc.name) await ctx.db.patch(kid._id, { parent: name })
            }
          }
        }

        // وما تبدّلت درجتُه — صار الرئيسُ فرعًا أو الفرعُ رئيسًا — يُنقل
        // اسمُه في الفوائد من حقلٍ إلى حقل. وإغفالُه يُبقي التصنيفَ مكتوبًا
        // في غير موضعه، فلا يُصفَّى به ولا يُعرف بابُ فائدته.
        if (wasSub !== isSub) {
          const from = wasSub ? 'sub_categories' : 'categories'
          const to = wasSub ? 'categories' : 'sub_categories'
          for (const p of await ctx.db.query('perks').collect()) {
            if (!(p[from] ?? []).includes(name)) continue
            await ctx.db.patch(p._id, {
              [from]: (p[from] ?? []).filter((x) => x !== name),
              [to]: [...new Set([...(p[to] ?? []), name])],
            })
          }
        }

        await ctx.db.patch(doc._id, { name, parent, icon: row.icon ?? '', order: i })
      } else {
        kept.add(await ctx.db.insert('perk_categories', {
          name, parent, icon: row.icon ?? '', order: i,
        }))
      }
    }

    // حذفُ الرئيس يحذف فروعَه معه: الفرعُ لا يقوم بغير رئيسه
    const gone = old.filter((o) => !kept.has(o._id))
    const goneNames = gone.map((o) => o.name)
    // والفرعُ الذي حُذف رئيسُه يُقرأ اسمُه من القاعدة لا من النسخة التي
    // بين اليدين: قد يكون سُمّي في هذا الحفظ نفسِه، فالمحفوظُ هو الذي في
    // الفوائد الآن
    const orphans = []
    for (const o of old) {
      if (!kept.has(o._id) || !goneNames.includes(o.parent ?? '')) continue
      const now = await ctx.db.get(o._id)
      orphans.push({ _id: o._id, name: now?.name ?? o.name, parent: now?.parent ?? o.parent })
    }
    const dropped = [...gone, ...orphans]

    // ويُرفع المحذوفُ من الفوائد المنسوبة إليه، رئيسًا كان أو فرعًا — ولا
    // تُحذف فائدةٌ واحدة
    await syncDrop(ctx, 'categories', dropped.filter((o) => !(o.parent ?? '')).map((o) => o.name))
    await syncDrop(ctx, 'sub_categories', dropped.filter((o) => !!(o.parent ?? '')).map((o) => o.name))

    for (const doc of dropped) await ctx.db.delete(doc._id)
  },
})

const figureRow = v.object({
  id: v.optional(v.string()),
  name: v.string(),
  death: v.optional(v.string()),
  note: v.optional(v.string()),
})

export const savePerkFigures = mutation({
  args: { rows: v.array(figureRow) },
  handler: async (ctx, { rows }) => {
    await requireOwner(ctx)
    const old = await ctx.db.query('perk_figures').collect()
    const kept = new Set<string>()

    for (const row of rows) {
      const name = row.name.trim()
      if (!name) continue
      const doc = old.find((o) => o._id === row.id)
      if (doc) {
        kept.add(doc._id)
        if (doc.name !== name) await syncRename(ctx, 'people', doc.name, name)
        await ctx.db.patch(doc._id, { name, death: row.death ?? '', note: row.note ?? '' })
      } else {
        kept.add(await ctx.db.insert('perk_figures', {
          name, death: row.death ?? '', note: row.note ?? '',
        }))
      }
    }
    const gone = old.filter((o) => !kept.has(o._id))
    await syncDrop(ctx, 'people', gone.map((o) => o.name))
    for (const doc of gone) await ctx.db.delete(doc._id)
  },
})

/**
 * عَلَمٌ يُسجَّل من نموذج الفائدة نفسه: الاسمُ يخطر ساعةَ التقييد، ولا يُخرَج
 * صاحبُه إلى نافذة الإعدادات ليُسجِّله ثم يعود. والموجودُ يُعاد كما هو.
 */
export const findOrCreatePerkFigure = mutation({
  args: { name: v.string(), death: v.optional(v.string()) },
  handler: async (ctx, { name, death }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('اسم العَلَم فارغ.')
    const found = await ctx.db
      .query('perk_figures')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    if (found) return found._id
    return await ctx.db.insert('perk_figures', {
      name: trimmed, death: (death ?? '').trim(), note: '',
    })
  },
})

export const insertNotebook = mutation({
  args: { name: v.string(), note: v.optional(v.string()), icon: v.optional(v.string()) },
  handler: async (ctx, { name, note, icon }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('اسم الكرّاسة فارغ.')
    return await ctx.db.insert('perk_notebooks', {
      name: trimmed, note: (note ?? '').trim(), icon: icon ?? '',
    })
  },
})

export const updateNotebook = mutation({
  args: {
    id: v.id('perk_notebooks'),
    patch: v.object({
      name: v.optional(v.string()),
      note: v.optional(v.string()),
      icon: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

/**
 * حذفُ الكرّاسة لا يحذف فوائدَها: هي مسألةٌ جُمع لها المتفرِّق، ورفعُ الجمع
 * لا يرفع المجموع. وإنما يُرفع معرّفُها من كل فائدةٍ كانت فيها.
 */
export const deleteNotebook = mutation({
  args: { id: v.id('perk_notebooks') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    for (const p of await ctx.db.query('perks').collect()) {
      const list = p.notebook_ids ?? []
      if (!list.includes(id)) continue
      await ctx.db.patch(p._id, { notebook_ids: list.filter((x) => x !== id) })
    }
    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// الإعارة
// ---------------------------------------------------------------------------

export const insertLoan = mutation({
  args: {
    book_id: v.id('books'),
    borrower: v.string(),
    due_date: v.union(v.string(), v.null()),
  },
  handler: async (ctx, loan) => {
    await requireOwner(ctx)
    await ctx.db.insert('loans', {
      ...loan,
      lent_date: new Date().toISOString().slice(0, 10),   // كان current_date
      returned: false,
    })
  },
})

export const returnLoan = mutation({
  args: { id: v.id('loans') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, { returned: true })
  },
})

// ---------------------------------------------------------------------------
// الإعدادات: مستند واحد، يُنشأ عند أوّل حفظ
// ---------------------------------------------------------------------------

export const updateSettings = mutation({
  args: {
    patch: v.object({
      theme: v.optional(v.union(v.literal('warm'), v.literal('sepia'), v.literal('dark'))),
      font: v.optional(v.union(v.literal('kitab'), v.literal('classic'), v.literal('modern'))),
      ui_scale: v.optional(v.number()),
      show_status_dots: v.optional(v.boolean()),
      show_ratings: v.optional(v.boolean()),
      default_view: v.optional(v.union(v.literal('grid'), v.literal('table'), v.literal('shelf'))),
      currency: v.optional(v.string()),
      landing_title: v.optional(v.string()),
      landing_tagline: v.optional(v.string()),
      landing_intro: v.optional(v.string()),
      show_landing_stats: v.optional(v.boolean()),
      show_landing_quote: v.optional(v.boolean()),
      /**
       * أنواعُ الفوائد. باقيةٌ في المخطّط ولا تُكتب اليوم: صارت جدولًا
       * (`perk_kinds`) لأن لكلّ نوعٍ أيقونتَه، والقائمةُ النصّية لا تحملها.
       */
      perk_kinds: v.optional(v.array(v.string())),
      auto_rotate: v.optional(v.boolean()),
      rotate_seconds: v.optional(v.number()),
      quote_seconds: v.optional(v.number()),
      about_text: v.optional(v.string()),
      x_url: v.optional(v.string()),
      telegram_url: v.optional(v.string()),
      visibility: v.optional(visibility),
      hidden_fields: v.optional(v.array(v.string())),
      hidden_categories: v.optional(v.array(v.string())),
      hidden_book_ids: v.optional(v.array(v.id('books'))),

      show_landing_place: v.optional(v.boolean()),
      show_calculator: v.optional(v.boolean()),
      field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      book_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
      hidden_author_ids: v.optional(v.array(v.string())),
      hidden_author_fields: v.optional(v.array(v.string())),
      author_field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      author_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
      hidden_publisher_ids: v.optional(v.array(v.string())),
      hidden_publisher_fields: v.optional(v.array(v.string())),
      publisher_field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
      publisher_field_overrides: v.optional(v.record(v.string(), v.array(v.string()))),
    }),
  },
  handler: async (ctx, { patch }) => {
    await requireOwner(ctx)
    const row = await ctx.db.query('library_settings').first()
    if (row) await ctx.db.patch(row._id, patch)
    else await ctx.db.insert('library_settings', { ...DEFAULT_SETTINGS, ...patch })
  },
})

// ---------------------------------------------------------------------------
// دُوْر النَّشْر
// ---------------------------------------------------------------------------

/**
 * الدار تُكتب مرةً واحدة: أوّلَ كتابٍ نشرَته يُكتب اسمُها ومكانُها، ثم يُملأ
 * المكان من سجلّها في كل كتابٍ بعده. ولا يُعدَّل المكان من نموذج الكتاب —
 * وإلا اختلف مكانُ الدار الواحدة من كتابٍ إلى كتاب — بل من صفحة دُور النشر.
 */
export const findOrCreatePublisher = mutation({
  args: { name: v.string(), place: v.optional(v.string()) },
  handler: async (ctx, { name, place }) => {
    await requireOwner(ctx)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('اسم الدار فارغ.')

    const found = await ctx.db
      .query('publishers')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    // مكانُ الدار المحفوظ لا يُكتب فوقه من نموذج الكتاب، لكنّ الفارغ يُسدّ
    if (found) {
      if (!found.place && place?.trim()) await ctx.db.patch(found._id, { place: place.trim() })
      return toClient((await ctx.db.get(found._id))!)
    }

    const id = await ctx.db.insert('publishers', {
      name: trimmed, place: place?.trim() ?? '', founded: '', website: '', notes: '',
    })
    return toClient((await ctx.db.get(id))!)
  },
})

/**
 * تعديل دار. الاسم والمكان مُكرَّران على كتبها — كما يُكرَّر اسم المؤلِّف —
 * فتُزامَن هنا صراحةً، وإلا بقي على الكتب اسمٌ أو مكانٌ قديم.
 */
export const updatePublisher = mutation({
  args: {
    id: v.id('publishers'),
    patch: v.object({
      name: v.optional(v.string()),
      place: v.optional(v.string()),
      founded: v.optional(v.string()),
      website: v.optional(v.string()),
      notes: v.optional(v.string()),
      logo_url: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    const before = await ctx.db.get(id)
    if (!before) throw new Error('لا دار بهذا المعرّف.')

    await ctx.db.patch(id, patch)

    const renamed = patch.name !== undefined && patch.name !== before.name
    const moved = patch.place !== undefined && patch.place !== before.place
    if (!renamed && !moved) return

    const books = await ctx.db
      .query('books')
      .withIndex('by_publisher', (q) => q.eq('publisher_id', id))
      .collect()
    for (const b of books) {
      await ctx.db.patch(b._id, {
        ...(renamed ? { publisher: patch.name } : {}),
        ...(moved ? { place: patch.place } : {}),
      })
    }

    // والدارُ المشارِكة اسمُها مُكرَّرٌ على الكتاب كاسم الأولى، فيُزامَن مثلَه
    // — وإغفالُه يترك على غلافٍ اسمًا قديمًا وعلى غيره الجديد. ولا فهرس
    // لها فتُمسح الكتبُ كلُّها؛ وهي مسحةٌ لا تقع إلا عند تسمية دارٍ من جديد.
    if (!renamed) return
    for (const b of await ctx.db.query('books').collect()) {
      const presses = b.co_publishers ?? []
      if (!presses.some((c) => c.publisher_id === id)) continue
      await ctx.db.patch(b._id, {
        co_publishers: presses.map(
          (c) => (c.publisher_id === id ? { ...c, name: patch.name! } : c),
        ),
      })
    }
  },
})

/** حذف دار: تُفكّ عن كتبها ويبقى اسمُها مكتوبًا عليها، فلا يضيع خبرُ الطبعة */
export const removePublisher = mutation({
  args: { id: v.id('publishers') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    const books = await ctx.db
      .query('books')
      .withIndex('by_publisher', (q) => q.eq('publisher_id', id))
      .collect()
    for (const b of books) await ctx.db.patch(b._id, { publisher_id: null })

    // وتُفكّ عن الكتب التي شارَكت في إخراجها كذلك، ويبقى اسمُها مكتوبًا
    for (const b of await ctx.db.query('books').collect()) {
      const presses = b.co_publishers ?? []
      if (!presses.some((c) => c.publisher_id === id)) continue
      await ctx.db.patch(b._id, {
        co_publishers: presses.map(
          (c) => (c.publisher_id === id ? { ...c, publisher_id: null } : c),
        ),
      })
    }

    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// التصنيفات: قائمة أسماء فريدة
// ---------------------------------------------------------------------------

/** `parent` فارغًا: تصنيفٌ رئيس. وباسم رئيسه: فرعٌ تحته. */
export const addCategory = mutation({
  args: { name: v.string(), position: v.number(), parent: v.optional(v.string()) },
  handler: async (ctx, { name, position, parent }) => {
    await requireOwner(ctx)
    const exists = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (exists) return
    await ctx.db.insert('categories', { name, position, parent: parent?.trim() || undefined })
  },
})

/** حذفُ الرئيس يحذف فروعَه معه: الفرعُ لا يقوم بغير رئيسه */
export const removeCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireOwner(ctx)
    const row = await ctx.db
      .query('categories').withIndex('by_name', (q) => q.eq('name', name)).first()
    if (!row) return

    if (!row.parent) {
      const children = (await ctx.db.query('categories').collect())
        .filter((c) => c.parent === name)
      for (const child of children) await ctx.db.delete(child._id)
    }
    await ctx.db.delete(row._id)
  },
})

// ---------------------------------------------------------------------------
// صور صفحة الهبوط واقتباساتها — قائمتان مستقلّتان، تدور كلٌّ على مهلها
// ---------------------------------------------------------------------------

export const addLandingImage = mutation({
  args: { position: v.number() },
  handler: async (ctx, { position }) => {
    await requireOwner(ctx)
    await ctx.db.insert('landing_images', { image_url: null, position })
  },
})

export const updateLandingImage = mutation({
  args: {
    id: v.id('landing_images'),
    patch: v.object({
      image_url: v.optional(v.union(v.string(), v.null())),
      position: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

export const removeLandingImage = mutation({
  args: { id: v.id('landing_images') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})

export const addLandingQuote = mutation({
  args: { position: v.number() },
  handler: async (ctx, { position }) => {
    await requireOwner(ctx)
    await ctx.db.insert('landing_quotes', { text: '', author: '', position })
  },
})

export const updateLandingQuote = mutation({
  args: {
    id: v.id('landing_quotes'),
    patch: v.object({
      text: v.optional(v.string()),
      author: v.optional(v.string()),
      position: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireOwner(ctx)
    await ctx.db.patch(id, patch)
  },
})

export const removeLandingQuote = mutation({
  args: { id: v.id('landing_quotes') },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx)
    await ctx.db.delete(id)
  },
})
