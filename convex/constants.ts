import { v } from 'convex/values'

// ثوابت مشتركة بين الخادم (convex/) والواجهة (src/). لا تستورد شيئًا من
// convex/server هنا حتى تبقى صالحة للاستيراد داخل حزمة المتصفح.

/** حالات القراءة المسموح بها — مصدر واحد للحقيقة يستخدمه الجدول والنموذج. */
export const READING_STATUSES = ['لم يُقرأ', 'قيد القراءة', 'انتهى'] as const

export const readingStatusValidator = v.union(
  v.literal('لم يُقرأ'),
  v.literal('قيد القراءة'),
  v.literal('انتهى')
)

/** حقول الكتاب التي يملأها المستخدم (دون المالك وحقول النظام). */
export const bookFields = {
  title: v.string(),
  author: v.optional(v.string()),
  category: v.optional(v.string()),
  shelfLocation: v.optional(v.string()),
  readingStatus: readingStatusValidator,
  publicationYear: v.optional(v.number()),
  notes: v.optional(v.string()),
}
