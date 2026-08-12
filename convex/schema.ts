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

export const readingStatus = v.union(
  v.literal('لم تُقرأ'), v.literal('قيد القراءة'), v.literal('تم القراءة'),
)

export const perkKind = v.union(v.literal('فائدة'), v.literal('مقتطف'))

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

/** حقول الكتاب. مُصدَّرة ليعيد استعمالها مُحوِّل الإضافة والتعديل. */
export const bookFields = {
  // ١. بيانات الكتاب
  title: v.string(),
  subtitle: v.string(),
  author_id: v.union(v.id('authors'), v.null()),
  author_name: v.string(),          // مُكرَّر للبحث والترتيب
  verifier: v.string(),
  translator: v.string(),
  presenter: v.string(),
  series: v.string(),
  series_no: v.string(),
  category: v.string(),
  room: v.string(),

  // ٢. بيانات النشر
  publisher: v.string(),
  place: v.string(),
  year: v.union(v.number(), v.null()),
  year_era: era,
  edition: v.string(),
  parts: v.union(v.number(), v.null()),
  volumes: v.union(v.number(), v.null()),
  volume_pages: v.array(v.union(v.number(), v.string())),
  pages: v.union(v.number(), v.null()),
  size: v.string(),
  isbn: v.string(),
  language: v.string(),

  // ٣. النسخة وموضعها
  shelf_no: v.string(),
  binding: v.string(),
  condition: v.string(),
  source: v.string(),
  acquired_day: v.union(v.number(), v.null()),
  acquired_month: v.union(v.number(), v.null()),
  acquired_year: v.union(v.number(), v.null()),
  value: v.union(v.number(), v.null()),

  // ٤. القراءة والملاحظات
  topic: v.string(),
  tags: v.array(v.string()),
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
    .index('by_room', ['room'])
    .index('by_status', ['status'])
    // بحث النصّ الكامل بديلًا عن ترشيح العنوان في المتصفّح
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['category', 'room', 'status'],
    }),

  authors: defineTable({
    name: v.string(),
    full_name: v.string(),
    birth: v.union(v.number(), v.null()),
    death: v.union(v.number(), v.null()),
    era,
    bio: v.string(),
  }).index('by_name', ['name']),

  book_works: defineTable({
    book_id: v.id('books'),
    target_book_id: v.id('books'),
    type: v.string(),
  })
    .index('by_book', ['book_id'])
    .index('by_target', ['target_book_id']),

  perks: defineTable({
    book_id: v.id('books'),
    kind: perkKind,
    title: v.string(),
    text: v.string(),
    page: v.string(),
  }).index('by_book', ['book_id']),

  loans: defineTable({
    book_id: v.id('books'),
    borrower: v.string(),
    lent_date: v.string(),                    // ISO: YYYY-MM-DD
    due_date: v.union(v.string(), v.null()),
    returned: v.boolean(),
  }).index('by_book', ['book_id']),

  shelves: defineTable({
    name: v.string(),
    position: v.number(),
  }).index('by_name', ['name']),

  categories: defineTable({
    name: v.string(),
    position: v.number(),
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
    rotate_seconds: v.number(),

    // الخصوصية (§٦)
    visibility,
    hidden_fields: v.array(v.string()),
    hidden_categories: v.array(v.string()),
    hidden_book_ids: v.array(v.id('books')),
  }),

  landing_slides: defineTable({
    image_url: v.union(v.string(), v.null()),
    quote: v.string(),
    author: v.string(),
    position: v.number(),
  }),
})
