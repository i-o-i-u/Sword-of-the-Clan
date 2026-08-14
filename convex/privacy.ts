// الخصوصية: منقولة عن عروض public_* في supabase/schema.sql.
//
// المبدأ الذي لا يُتنازل عنه: ما أخفاه صاحب المكتبة **لا يغادر الخادم**. كل
// استعلامٍ يقرأ هويّة الطالب أوّلًا، فإن لم يكن صاحب المكتبة مرّت البيانات من
// هنا قبل أن تُرسل. لا تُخفِ شيئًا في المتصفّح.

import type { Doc } from './_generated/dataModel'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

type Ctx = QueryCtx | MutationCtx

export const DEFAULT_VISIBILITY = {
  status: true, ratings: true, notes: false, blurb: true, perks: true,
  loans: false, value: false, stats: true, authors: true, advSearch: true,
}

/**
 * الإعدادات كما في المخطّط، بلا حقول النظام — فتبقى مشتقّةً منه لا مكرَّرة.
 * `Required` يرفع الاختياريّة عن الحقول المستجدّة: المخطّط يقبل غيابها عن
 * المستند القديم، أمّا ما تُصدره `loadSettings` فمكتملٌ دائمًا.
 */
export type Settings = Required<Omit<Doc<'library_settings'>, '_id' | '_creationTime'>>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'warm',
  font: 'kitab',
  ui_scale: 100,
  show_status_dots: true,
  show_ratings: true,
  default_view: 'grid',
  currency: 'ريال',
  landing_title: 'مكتبة سيف العشيرة',
  landing_tagline: 'فهرسٌ حيّ لكل كتابٍ في البيت',
  landing_intro:
    'كل كتابٍ اقتنيناه له مكانه، وكل قراءةٍ لها أثرها. هنا فهرس المكتبة المنزلية: '
    + 'أرففها وتصانيفها وحكاياتها الصغيرة بين الصفحات.',
  show_landing_stats: true,
  show_landing_quote: true,
  auto_rotate: true,
  rotate_seconds: 6,
  quote_seconds: 12,
  // نصٌّ تجريبيّ يكتب صاحب المكتبة مكانَه ما يشاء من نافذة الإعدادات
  about_text:
    'مكتبة سيف العشيرة مكتبةٌ منزليّة، نشأت كتابًا كتابًا على مهلٍ لا على عجل، '
    + 'وما جُمع فيها إنما جُمع ليُقرأ لا ليُركن على رفٍّ.\n\n'
    + 'هذا الموقع فهرسها: يُعرِّف بكل كتابٍ فيها، وبمؤلِّفه وطبعته وموضعه من '
    + 'الرفّ، وما عَلِق به من فائدةٍ أو مقتطف. وهو مفتوحٌ لمن أراد أن يتصفّح، '
    + 'فما في المكتبة من علمٍ ليس ملكًا لصاحبها وحده.\n\n'
    + '(هذا نصٌّ تجريبيٌّ إلى أن يُكتب مكانَه ما يليق.)',
  x_url: '',
  telegram_url: '',
  visibility: DEFAULT_VISIBILITY,
  hidden_fields: [],
  hidden_categories: [],
  hidden_book_ids: [],
}

/** إعدادات المكتبة، أو الافتراضيّات قبل أوّل حفظ */
export async function loadSettings(ctx: Ctx): Promise<Settings> {
  const row = await ctx.db.query('library_settings').first()
  return row ? { ...DEFAULT_SETTINGS, ...stripSystem(row) } : DEFAULT_SETTINGS
}

/** هل الطالب هو صاحب المكتبة؟ بديل is_owner() في SQL */
export async function isOwner(ctx: Ctx): Promise<boolean> {
  const userId = await getAuthUserId(ctx)
  if (userId === null) return false
  const owner = await ctx.db.query('library_owner').first()
  return owner !== null && owner.user_id === userId
}

/** يرفع الطلب إن لم يكن الطالب صاحب المكتبة. تُصدَّر للمُحوِّلات. */
export async function requireOwner(ctx: Ctx): Promise<void> {
  if (!(await isOwner(ctx))) {
    throw new Error('هذا الإجراء لصاحب المكتبة وحده.')
  }
}

function stripSystem<T extends { _id: unknown; _creationTime: number }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc
  return rest
}

/** يحوّل مستند Convex إلى ما تنتظره الواجهة: id نصّي وتاريخ إنشاء ISO */
export function toClient<T extends { _id: unknown; _creationTime: number }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc
  const out = {
    ...rest,
    id: _id as string,
    created_at: new Date(_creationTime).toISOString(),
  } as Record<string, unknown> & { id: string; created_at: string }
  // «تم القراءة» لفظٌ قديم في القاعدة، والمعتمَد «مقروء». يُحوَّل هنا مرةً
  // واحدة فلا تعرف الواجهةُ إلا اللفظ الجديد، وتبقى المستندات القديمة صحيحة.
  if (out.status === 'تم القراءة') out.status = 'مقروء'
  return out as unknown as Omit<T, '_id' | '_creationTime'> & { id: string; created_at: string }
}

/**
 * الكتب الظاهرة للزائر: ناقصةَ المخفيّة بعينها، وناقصةَ ما كان في تصنيفٍ مخفيّ.
 * (شرط WHERE في public_books)
 */
export function bookIsPublic(book: Doc<'books'>, s: Settings): boolean {
  if (s.hidden_book_ids.includes(book._id)) return false
  if (s.hidden_categories.includes(book.category ?? '')) return false
  return true
}

/**
 * يحجب حقول الكتاب حسب قائمة «حقول بيانات الكتاب» (§٦-ب) ومفاتيح «ما يراه
 * الزوار» (§٦-أ). مطابقٌ لتعبيرات CASE في العرض public_books — ومفاتيح
 * hidden_fields تُكتب كما هي هناك (`seriesNo`, `yearLabel`, `volumePagesText`,
 * `shelfNo`, `acquired`) فلا تُغيَّر صياغتها.
 */
export function redactBook(book: Doc<'books'>, s: Settings) {
  const hidden = (key: string) => s.hidden_fields.includes(key)
  const vis = s.visibility

  return {
    ...toClient(book),

    subtitle:     hidden('subtitle')     ? '' : book.subtitle,
    contributors: hidden('contributors') ? [] : book.contributors,
    series:       hidden('series')       ? '' : book.series,
    series_no:    hidden('seriesNo')     ? '' : book.series_no,
    publisher:    hidden('publisher')    ? '' : book.publisher,
    place:        hidden('place')        ? '' : book.place,
    year:         hidden('yearLabel')    ? null : book.year,
    year_month:   hidden('yearLabel')    ? null : book.year_month,
    year_era:     hidden('yearLabel')    ? '' : book.year_era,
    year_text:    hidden('yearLabel')    ? '' : book.year_text,
    edition:      hidden('edition')      ? '' : book.edition,
    edition_notes: hidden('edition')     ? '' : book.edition_notes,
    parts:        hidden('parts')        ? null : book.parts,
    volumes:      hidden('volumes')      ? null : book.volumes,
    pages:        hidden('pages')        ? null : book.pages,
    volume_pages: hidden('volumePagesText') ? [] : book.volume_pages,
    volume_parts: hidden('volumePagesText') ? [] : (book.volume_parts ?? []),
    index_volumes: hidden('volumePagesText') ? [] : (book.index_volumes ?? []),
    size:         hidden('size')         ? '' : book.size,
    isbn:         hidden('isbn')         ? '' : book.isbn,
    language:     hidden('language')     ? '' : book.language,
    language_original: hidden('language') ? '' : book.language_original,
    cabinet_no:   hidden('cabinet')      ? '' : book.cabinet_no,
    shelf_no:     hidden('shelfNo')      ? '' : book.shelf_no,
    binding:      hidden('binding')      ? '' : book.binding,
    condition:    hidden('condition')    ? '' : book.condition,
    source:        hidden('source')      ? '' : book.source,
    source_detail: hidden('source')      ? '' : book.source_detail,
    acquired_month: hidden('acquired')   ? null : book.acquired_month,
    acquired_year:  hidden('acquired')   ? null : book.acquired_year,
    acquired_text:  hidden('acquired')   ? '' : book.acquired_text,
    margin_note:  hidden('marginNote')   ? '' : book.margin_note,
    topic:        hidden('topic')        ? '' : book.topic,

    value:  vis.value   ? book.value  : null,
    rating: vis.ratings ? book.rating : 0,
    status: vis.status  ? book.status : '',
    blurb:  vis.blurb   ? book.blurb  : '',
    notes:  vis.notes   ? book.notes  : '',
  }
}

/**
 * الإعدادات كما يراها الزائر: قوائم المخفيّ لا تُنشر، فلا يعرف الزائر حتى أنّ
 * هناك ما هو مخفيّ. (العرض public_settings)
 */
export function redactSettings(s: Settings) {
  const { hidden_fields, hidden_categories, hidden_book_ids, ...rest } = s
  return { ...rest, hidden_fields: [], hidden_categories: [], hidden_book_ids: [] }
}
