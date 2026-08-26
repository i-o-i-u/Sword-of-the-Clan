// مخطّط Convex، منقولٌ عن supabase/schema.sql حقلًا بحقل.
//
// أسماء الحقول باقية على snake_case كما كانت في Postgres عمدًا: الواجهة كلها
// تقرأ `book.author_id` و`loan.lent_date`، فإبقاء الأسماء يجعل الهجرة تبديلَ
// طبقةِ بياناتٍ لا إعادةَ كتابةٍ للواجهة.
//
// ما لا يُنقل: قيود CHECK وRLS. الأولى تُفرض في المُحوِّلات (mutations)،
// والثانية تُلغى أصلًا — في Convex الصلاحية شرطٌ داخل الدالة لا سياسة جدول.

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export const era = v.union(
  v.literal('هـ'), v.literal('م'), v.literal('ق.هـ'), v.literal('ق.م'),
)

/**
 * حالة القراءة. الفراغ حالةٌ رابعة مقصودة: «غير معروفة»، يرجع إليها صاحب
 * المكتبة متى أراد رفع ما أثبته.
 *
 * ولفظان متروكان باقيان في الاتحاد لأن في القاعدة مستنداتٍ كُتبت بهما:
 * «تم القراءة» قبل أن يصير «مقروء»، و«لم تُقرأ» قبل أن تصير «لم يُقرأ»
 * — الفاعلُ الكتابُ لا الصفحة. يقبلهما المخطّط، ويحوّلهما `toClient` عند
 * القراءة فلا تراهما الواجهة.
 */
export const readingStatus = v.union(
  v.literal('لم يُقرأ'), v.literal('قيد القراءة'), v.literal('مقروء'),
  v.literal('تم القراءة'), v.literal('لم تُقرأ'), v.literal(''),
)

/**
 * نوعُ القيد: **نصٌّ حرّ لا اتّحادُ ألفاظٍ مغلق**.
 *
 * كان اتّحادًا مغلقًا، فلم يكن لصاحب المكتبة أن يزيد نوعًا ولا أن يُعدِّل
 * اسمَ نوع — وتلك أبوابُ كنّاشه هو، لا تُملى عليه. فالأنواعُ اليوم قائمةٌ
 * في `library_settings.perk_kinds` يحرّرها من إعدادات القسم، وهذا الحقلُ
 * يحمل ما اختاره منها.
 *
 * وتعديلُ اسم النوع يُزامَن على قيوده في `catalog.renamePerkKind` — كما
 * يُزامَن اسمُ المؤلِّف على كتبه — وإغفالُه يترك قيودًا بنوعٍ لا وجود له.
 */
export const perkKind = v.string()

/**
 * مصدرُ القيد حين لا يكون من كتب المكتبة: ما قُرئ في مكتبةٍ عامّة، أو في
 * نسخةٍ إلكترونيّة، أو في كتابٍ مستعار. يُكتب نصًّا كما يُكتب في العزو، ولا
 * يُفهرس — فليس من كتب البيت حتى تُطلب بياناتُه كاملة.
 */
export const perkSource = v.object({
  title: v.string(),
  author: v.string(),
  /** الطبعةُ ودارُها وسنتُها ومحقِّقُها، سطرًا واحدًا كما يُكتب في الحاشية */
  edition: v.string(),
})

/** مفاتيح «ما يراه الزوار» (§٦-أ) */
export const visibility = v.object({
  status: v.boolean(),
  ratings: v.boolean(),
  notes: v.boolean(),
  blurb: v.boolean(),
  perks: v.boolean(),
  loans: v.boolean(),
  value: v.boolean(),
  stats: v.boolean(),
  authors: v.boolean(),
  advSearch: v.boolean(),
})

/** مؤلِّفٌ مشارك. الأول يبقى في `author_id`، وهؤلاء من بعده. */
export const coAuthor = v.object({
  author_id: v.union(v.id('authors'), v.null()),
  name: v.string(),
})

/**
 * مَن عمل في الكتاب غير مؤلِّفه، ودورُه معه: محقِّقٌ ومراجعٌ ومخرِّج… وقد
 * يجتمع في كتابٍ واحد محقِّقان ومقدِّمون، فهي قائمةٌ لا حقولٌ معدودة.
 *
 * و`scope` نطاقُ عمله من الكتاب: قد يُحقِّق الأولَ رجلٌ والثانيَ غيرُه، فيُكتب
 * لكلٍّ ما عمل فيه نصًّا («١-٣»، «السِّفر الأول»). اختياريّ لأن المفهرَس قبله
 * لا يحمله، والفراغُ فيه معناه: عمل في الكتاب كلِّه.
 */
export const contributor = v.object({
  role: v.string(),
  name: v.string(),
  scope: v.optional(v.string()),
  /**
   * صاحبُ الاسم في سجلّ الأشخاص، وهو جدول `authors` نفسه: المحقِّق قد يكون
   * مؤلِّفًا — محمود شاكر حقّق وألّف — فلا يُفرَد له سجلٌّ ثانٍ تُكرَّر فيه
   * وفاتُه وترجمتُه. اختياريّ لأن المفهرَس قبله لا يحمله.
   */
  person_id: v.optional(v.union(v.id('authors'), v.null())),
})

/**
 * مجلَّدٌ ناقص من الطبعة: رقمُه وسببُ فقده. والسبب يجوز أن يُترك، فيُكتفى
 * بأنه ناقص — لا يُلزَم الفاهرس بما لا يعرف.
 */
export const missingVolume = v.object({
  no: v.number(),
  reason: v.string(),
})

/** حقول الكتاب. مُصدَّرة ليعيد استعمالها مُحوِّل الإضافة والتعديل. */
export const bookFields = {
  // ١. بيانات الكتاب
  title: v.string(),
  subtitle: v.string(),
  author_id: v.union(v.id('authors'), v.null()),
  author_name: v.string(),          // مُكرَّر للبحث والترتيب
  co_authors: v.array(coAuthor),
  contributors: v.array(contributor),
  series: v.string(),
  series_no: v.string(),
  category: v.string(),
  // التصنيف الفرعيّ داخل الرئيسيّ: «النحو والصرف» تحت «العربية». يُحفظ مع
  // رئيسه لا بدلًا منه، فيُصفَّى بالاثنين جميعًا.
  sub_category: v.optional(v.string()),

  // ٢. بيانات الطبعة
  publisher_id: v.union(v.id('publishers'), v.null()),
  publisher: v.string(),            // مُكرَّر لاسم الدار كما في الكتاب
  place: v.string(),                // تابعٌ للدار، يُملأ منها
  year: v.union(v.number(), v.null()),
  year_month: v.union(v.number(), v.null()),   // شهرٌ هجريّ، وقد لا يُعرف
  year_era: era,
  year_approx: v.boolean(),
  year_text: v.string(),            // «نحو ١٤٠٠ هـ» حين لا تُعرف السنة
  edition: v.string(),              // «٢» أو «الثانية» بعد تحويلها كتابةً
  edition_worded: v.boolean(),
  edition_notes: v.string(),        // مَزِيدة، مُنقَّحة…
  size: v.string(),
  parts: v.union(v.number(), v.null()),
  single_part: v.boolean(),
  volumes: v.union(v.number(), v.null()),
  single_volume: v.boolean(),
  volume_pages: v.array(v.union(v.number(), v.string())),
  // ما اشتمل عليه كل مجلَّد من أسفار المؤلِّف وأجزائه، نصًّا كما يُكتب
  // («٥-٧»، «الثامن»). اختياريّ لأن الكتب المفهرَسة قبله لا تحمله.
  volume_parts: v.optional(v.array(v.string())),
  // أرقام مجلَّدات الفهارس. لا تُحسب صفحاتُها في الإجمالي: فهرسٌ لا متن.
  index_volumes: v.optional(v.array(v.number())),
  // ما نقص من مجلَّدات الطبعة، لكلٍّ رقمُه وسببُ فقده على حِدَة: قد يتلف
  // الثاني وتضيع إعارةُ السابع.
  missing_volumes: v.optional(v.array(missingVolume)),
  pages: v.union(v.number(), v.null()),
  isbn: v.string(),
  language: v.string(),
  language_original: v.string(),    // لغة الأصل حين يكون الكتاب مترجَمًا

  // ٣. بيانات النسخة
  cabinet_no: v.string(),           // رقم الدولاب
  shelf_no: v.string(),             // رقم الرفّ داخله
  binding: v.string(),
  condition: v.string(),
  // ما يُوصف به حال النسخة على التفصيل. اختياريّ: المفهرَس قبله لا يحمله.
  condition_notes: v.optional(v.string()),
  value: v.union(v.number(), v.null()),
  source: v.string(),               // صِفة الورود: شِراء، إِهْداء، إرْث…
  source_detail: v.string(),        // مكان الشراء أو المُهدي أو المَوروث
  // يوم الوُرود. الطبعةُ لا يُعرف يومُها فلا يُسأل عنه، أمّا الوُرود فيُعرف.
  acquired_day: v.optional(v.union(v.number(), v.null())),
  acquired_month: v.union(v.number(), v.null()),
  acquired_year: v.union(v.number(), v.null()),
  acquired_approx: v.boolean(),
  acquired_text: v.string(),
  margin_note: v.string(),          // طُرَّة الكتاب: ما خُطَّ عليها بيد

  // ٤. عن الكتاب
  topic: v.string(),
  tags: v.array(v.string()),
  // كلماتٌ يُهتدى بها إلى الكتاب في البحث، ولا تُعرض وسومًا على بطاقته
  keywords: v.optional(v.array(v.string())),
  blurb: v.string(),
  notes: v.string(),
  status: readingStatus,
  rating: v.number(),

  // ٥. الصور
  cover_url: v.union(v.string(), v.null()),
  spine_images: v.record(v.string(), v.string()),   // {"1": "url"}
  use_spine: v.boolean(),
}

export default defineSchema({
  // جداول المصادقة (users, authAccounts, authSessions …) يديرها @convex-dev/auth
  ...authTables,

  // صاحب المكتبة: مستند واحد لا غير. يُفرض هذا في claimOwnership لا في المخطّط.
  library_owner: defineTable({
    user_id: v.id('users'),
    display_name: v.string(),
    claimed_at: v.number(),
  }).index('by_user', ['user_id']),

  books: defineTable(bookFields)
    .index('by_author', ['author_id'])
    .index('by_category', ['category'])
    .index('by_cabinet', ['cabinet_no'])
    .index('by_publisher', ['publisher_id'])
    .index('by_status', ['status'])
    // بحث النصّ الكامل بديلًا عن ترشيح العنوان في المتصفّح
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['category', 'cabinet_no', 'status'],
    }),

  authors: defineTable({
    name: v.string(),
    full_name: v.string(),
    birth: v.union(v.number(), v.null()),
    death: v.union(v.number(), v.null()),
    era,
    // وفاةُ المؤلِّف مِلاكُ ترتيب الكتب، فلها هنا ثلاث حالات: معاصرٌ حيّ،
    // أو وفاةٌ محقَّقة في `death`، أو تقريبٌ يُكتب نصًّا («نحو ١٠٦٠»،
    // «القرن الرابع») لأنه لا يُضبط برقم.
    alive: v.boolean(),
    death_approx: v.boolean(),
    death_text: v.string(),
    bio: v.string(),
  }).index('by_name', ['name']),

  /**
   * دُوْر النَّشْر. مكان الدار مُثبَتٌ فيها لا في الكتاب: تُكتب مرةً أولى ثم
   * يُملأ مكانُها تلقائيًّا في كل كتابٍ نشرَته، فلا يختلف مكانُ الدار الواحدة
   * من كتابٍ إلى كتاب. وتعديلُه من صفحة «دُوْر النَّشْر» وحدها.
   */
  publishers: defineTable({
    name: v.string(),
    place: v.string(),
    founded: v.string(),
    website: v.string(),
    notes: v.string(),
    // شعار الدار، يُرفع من صفحتها. اختياريّ لأن الدُّور المسجَّلة قبله بلا شعار.
    logo_url: v.optional(v.union(v.string(), v.null())),
  }).index('by_name', ['name']),

  book_works: defineTable({
    book_id: v.id('books'),
    target_book_id: v.id('books'),
    type: v.string(),
  })
    .index('by_book', ['book_id'])
    .index('by_target', ['target_book_id']),

  /**
   * القيود: ما استُخرج من الكتب من فوائدَ ونصوصٍ وتعقُّبات.
   *
   * و`book_id` يجوز أن يكون فارغًا (null): القيدُ قد يكون من كتابٍ ليس في
   * المكتبة، فيُكتب مصدرُه في `source` نصًّا. وما فُهرس قبل ذلك يحمل معرّفًا
   * صحيحًا فلا يمسّه هذا شيء.
   *
   * والحقولُ المستجدّة كلُّها اختياريّة بالضرورة: في القاعدة قيودٌ كُتبت
   * قبلها، وإلزامُها يُفشل تحقُّقَ المخطّط عليها.
   */
  perks: defineTable({
    book_id: v.union(v.id('books'), v.null()),
    kind: perkKind,
    title: v.string(),
    text: v.string(),
    page: v.string(),

    /** المجلَّد الذي فيه الموضع، حين يكون الكتابُ مجلَّدات */
    volume: v.optional(v.string()),
    /** بابُ القيد من أبواب العلم، وهي تصنيفات المكتبة نفسها لا جدولٌ ثانٍ */
    category: v.optional(v.string()),
    sub_category: v.optional(v.string()),
    /** كلماتٌ يُهتدى بها إليه، تُعرض وسومًا ويُبحث بها */
    tags: v.optional(v.array(v.string())),
    /** الأعلامُ المذكورون في القيد، يُجمع بهم ما تفرَّق عنهم */
    people: v.optional(v.array(v.string())),
    /** النفاسة: من صفرٍ إلى ثلاث. وما بلغ الثالثة فهو من «النفائس». */
    rating: v.optional(v.number()),
    /** الكرّاسة: اسمُ المسألة التي يُجمع لها المتفرّق، تُشتقّ من القيود */
    notebook: v.optional(v.string()),
    /** تعليقُ المُقيِّد على النصّ، يُميَّز عنه فلا يلتبس كلامُه بكلام غيره */
    comment: v.optional(v.string()),
    /** مصدرُه إن لم يكن في المكتبة */
    source: v.optional(perkSource),
  }).index('by_book', ['book_id']),

  loans: defineTable({
    book_id: v.id('books'),
    borrower: v.string(),
    lent_date: v.string(),                    // ISO: YYYY-MM-DD
    due_date: v.union(v.string(), v.null()),
    returned: v.boolean(),
  }).index('by_book', ['book_id']),

  /**
   * جدولٌ مهجور: كان «الرفّ داخل المكتبة» اسمًا يُختار من قائمةٍ يديرها صاحب
   * المكتبة. حلّ محلّه في الكتاب رقمُ الدولاب ورقمُ الرفّ، وصارت دواليبُ
   * صفحة التصفُّح تُشتقّ من الكتب نفسها. يبقى مُعرَّفًا لأن فيه صفَّ البذرة،
   * ويُحذف متى حُذف.
   */
  shelves: defineTable({
    name: v.string(),
    position: v.number(),
  }).index('by_name', ['name']),

  /**
   * التصنيفات، رئيسُها وفرعُها في جدولٍ واحد: الفرعُ صفٌّ فيه `parent` اسمُ
   * رئيسه، والرئيسُ صفٌّ بلا `parent`. والاسم فريدٌ في الجدول كلِّه، فلا
   * يلتبس فرعٌ بفرع.
   */
  categories: defineTable({
    name: v.string(),
    position: v.number(),
    parent: v.optional(v.string()),
  }).index('by_name', ['name']),

  // إعدادات المكتبة: مستند واحد لا غير
  library_settings: defineTable({
    theme: v.union(v.literal('warm'), v.literal('sepia'), v.literal('dark')),
    font: v.union(v.literal('kitab'), v.literal('classic'), v.literal('modern')),
    ui_scale: v.number(),
    show_status_dots: v.boolean(),
    show_ratings: v.boolean(),

    default_view: v.union(v.literal('grid'), v.literal('table'), v.literal('shelf')),
    currency: v.string(),

    landing_title: v.string(),
    landing_tagline: v.string(),
    landing_intro: v.string(),
    show_landing_stats: v.boolean(),
    show_landing_quote: v.boolean(),
    auto_rotate: v.boolean(),
    rotate_seconds: v.number(),          // صور الخلفية

    // الحقول المستجدّة اختياريّة عمدًا: مستند الإعدادات واحدٌ قائمٌ من قبل،
    // وإلزامُها يُفشل التحقّق عليه. `loadSettings` يسدّ الناقص من
    // DEFAULT_SETTINGS، فلا يصل إلى الواجهة حقلٌ غير معرَّف.
    quote_seconds: v.optional(v.number()),   // بطاقة الاقتباس، تدور على مهلها
    /** أنواعُ القيد كما يحرّرها صاحب المكتبة من إعدادات قسم الفوائد */
    perk_kinds: v.optional(v.array(v.string())),
    about_text: v.optional(v.string()),      // نصّ صفحة «عن المكتبة»
    x_url: v.optional(v.string()),
    telegram_url: v.optional(v.string()),

    // الخصوصية (§٦)
    visibility,
    hidden_fields: v.array(v.string()),
    hidden_categories: v.array(v.string()),
    hidden_book_ids: v.array(v.id('books')),

    // ------------------------------------------------ الخصوصية على التفصيل
    // ما يُخفى عن الزائر على ثلاث درجات: مستندٌ بعينه، وحقلٌ من مستندات
    // نوعه كلِّها، وحقلٌ من مستندٍ بعينه. والدرجة الثانية معها استثناء:
    // «أخفِ بلد كلِّ دار إلا هذه». وكلُّها اختياريّة، فمستند الإعدادات قائمٌ
    // من قبلها.
    //
    // والمعرّفات هنا نصوصٌ لا `v.id`: قائمةُ استثناءٍ تشير إلى كتابٍ محذوف
    // تُفشل تحقّقَ المخطّط على المستند كلِّه، وهي لا تضرّ إذ لا يُقرأ منها
    // إلا ما طابق موجودًا.
    show_landing_place: v.optional(v.boolean()),   // موضع المكتبة في الهبوط و«عنها»
    show_calculator: v.optional(v.boolean()),      // حاسبة القراءة للزوار

    /** مفتاحُه اسمُ الحقل، وقيمتُه معرّفاتُ الكتب المستثناة من إخفائه */
    field_exceptions: v.optional(v.record(v.string(), v.array(v.string()))),
    /** مفتاحُه معرّفُ الكتاب، وقيمتُه حقولٌ تُخفى منه وحده */
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

  // صور الخلفية خلف شعار صفحة الهبوط، تتبدّل بتلاشٍ كل `rotate_seconds`
  landing_images: defineTable({
    image_url: v.union(v.string(), v.null()),
    position: v.number(),
  }),

  // الاقتباسات، تتبدّل وحدها كل `quote_seconds`
  landing_quotes: defineTable({
    text: v.string(),
    author: v.string(),
    position: v.number(),
  }),

  /**
   * الجدول القديم: كان يجمع الصورة والاقتباس في صفٍّ واحد. فُصل إلى الجدولين
   * أعلاه لأن الصور والاقتباسات صارت تدور كلٌّ على مهلها. يبقى مُعرَّفًا حتى
   * ينقل `seed:run` صفوفه ويحذفها، ثم يُحذف من هنا.
   */
  landing_slides: defineTable({
    image_url: v.union(v.string(), v.null()),
    quote: v.string(),
    author: v.string(),
    position: v.number(),
  }),
})
