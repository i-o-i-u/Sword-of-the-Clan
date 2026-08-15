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

/** خريطةٌ من مفتاحٍ إلى معرّفات: قوائم الاستثناء وقوائم حقول المستند الواحد */
export type FieldMap = Record<string, string[]>

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

  show_landing_place: true,
  show_calculator: true,
  field_exceptions: {},
  book_field_overrides: {},
  hidden_author_ids: [],
  hidden_author_fields: [],
  author_field_exceptions: {},
  author_field_overrides: {},
  hidden_publisher_ids: [],
  hidden_publisher_fields: [],
  publisher_field_exceptions: {},
  publisher_field_overrides: {},
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
  // ألفاظٌ قديمة في القاعدة، والمعتمَد غيرُها: «مقروء» بدل «تم القراءة»،
  // و«لم يُقرأ» بدل «لم تُقرأ». تُحوَّل هنا مرةً واحدة فلا تعرف الواجهةُ إلا
  // اللفظ الجديد، وتبقى المستندات القديمة صحيحةً في القاعدة.
  if (out.status === 'تم القراءة') out.status = 'مقروء'
  if (out.status === 'لم تُقرأ') out.status = 'لم يُقرأ'
  return out as unknown as Omit<T, '_id' | '_creationTime'> & { id: string; created_at: string }
}

/**
 * هل هذا الحقل مخفيٌّ عن هذا المستند بعينه؟ ثلاث درجاتٍ مرتَّبة:
 *   ١. حقلٌ أُخفي من هذا المستند وحده — يُقدَّم على ما سواه.
 *   ٢. حقلٌ أُخفي من مستندات النوع كلِّها.
 *   ٣. واستثناءٌ يردّ المستند من الدرجة الثانية إلى الظهور.
 */
function fieldHidden(
  field: string, docId: string,
  all: string[], exceptions: FieldMap, overrides: FieldMap,
): boolean {
  if ((overrides[docId] ?? []).includes(field)) return true
  if (!all.includes(field)) return false
  return !(exceptions[field] ?? []).includes(docId)
}

/** حاجبُ حقول كتابٍ بعينه، مهيَّأً مرةً واحدة ليُنادى لكل حقل */
function bookFieldHider(book: Doc<'books'>, s: Settings) {
  return (field: string) => fieldHidden(
    field, book._id, s.hidden_fields, s.field_exceptions, s.book_field_overrides,
  )
}

/**
 * الكتب الظاهرة للزائر: ناقصةَ المخفيّة بعينها، وناقصةَ ما كان في تصنيفٍ
 * مخفيّ — رئيسِه أو فرعِه — وناقصةَ كتبِ مؤلِّفٍ مخفيّ.
 *
 * وإخفاءُ المؤلِّف يُخفي كتبَه لزامًا: لا يُعرض عنوانُ كتابٍ بلا مؤلِّفه.
 * والعكسُ ليس بلازم: يُخفى كتابٌ من كتبه ويبقى سائرُها.
 */
export function bookIsPublic(book: Doc<'books'>, s: Settings): boolean {
  if (s.hidden_book_ids.includes(book._id)) return false
  if (s.hidden_categories.includes(book.category ?? '')) return false
  if (book.sub_category && s.hidden_categories.includes(book.sub_category)) return false
  if (book.author_id && s.hidden_author_ids.includes(book.author_id)) return false
  return true
}

/**
 * الدارُ التي أُخفي اسمُها من كتابٍ لا يبقى الكتابُ منسوبًا إليها عند الزائر:
 * يسقط اسمُها وسِلَتُها جميعًا، فلا تُعدّ الدارُ ذات كتابٍ من جهته.
 */
export function bookPublisherVisible(book: Doc<'books'>, s: Settings): boolean {
  return !bookFieldHider(book, s)('publisher')
}

/**
 * يحجب حقول الكتاب حسب قائمة «حقول بيانات الكتاب» (§٦-ب) ومفاتيح «ما يراه
 * الزوار» (§٦-أ). مطابقٌ لتعبيرات CASE في العرض public_books — ومفاتيح
 * hidden_fields تُكتب كما هي هناك (`seriesNo`, `yearLabel`, `volumePagesText`,
 * `shelfNo`, `acquired`) فلا تُغيَّر صياغتها.
 */
export function redactBook(book: Doc<'books'>, s: Settings) {
  const hidden = bookFieldHider(book, s)
  const vis = s.visibility

  return {
    ...toClient(book),

    subtitle:     hidden('subtitle')     ? '' : book.subtitle,
    // التصنيف خبرٌ يُعرض على البطاقة، فيُخفى كما يُخفى سواه. وأمّا التصنيف
    // المخفيّ بعينه فيُخفي الكتابَ كلَّه، ويتكفّل به `bookIsPublic`.
    category:     hidden('category')     ? '' : book.category,
    sub_category: hidden('category')     ? '' : (book.sub_category ?? ''),
    // الغلاف والكعب صورتان، وهما من البيانات كغيرها: تُخفى صورةُ غلافٍ بعينه
    // أو أغلفةُ الكتب كلِّها.
    cover_url:    hidden('cover')        ? null : book.cover_url,
    spine_images: hidden('spine')        ? {} : book.spine_images,
    use_spine:    hidden('spine')        ? false : book.use_spine,
    missing_volumes: hidden('missingVolumes') ? [] : (book.missing_volumes ?? []),
    tags:         hidden('tags')         ? [] : book.tags,
    contributors: hidden('contributors') ? [] : book.contributors,
    series:       hidden('series')       ? '' : book.series,
    series_no:    hidden('seriesNo')     ? '' : book.series_no,
    // إخفاءُ اسم الدار يفكّ الكتابَ عن سجلّها أيضًا، وإلا دلّت الصلةُ على ما
    // حُجب اسمُه: يبقى الكتابُ عند الزائر غيرَ منسوبٍ إلى دارٍ أصلًا.
    publisher:    hidden('publisher')    ? '' : book.publisher,
    publisher_id: hidden('publisher')    ? null : book.publisher_id,
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
    condition_notes: hidden('conditionNotes') ? '' : (book.condition_notes ?? ''),
    source:        hidden('source')      ? '' : book.source,
    source_detail: hidden('source')      ? '' : book.source_detail,
    acquired_day:   hidden('acquired')   ? null : (book.acquired_day ?? null),
    acquired_month: hidden('acquired')   ? null : book.acquired_month,
    acquired_year:  hidden('acquired')   ? null : book.acquired_year,
    acquired_text:  hidden('acquired')   ? '' : book.acquired_text,
    margin_note:  hidden('marginNote')   ? '' : book.margin_note,
    topic:        hidden('topic')        ? '' : book.topic,
    // الكلمات المفتاحية سبيلٌ إلى الكتاب في البحث، لا خبرٌ عنه، فتمرّ كما هي
    keywords:     book.keywords ?? [],

    value:  vis.value   ? book.value  : null,
    rating: vis.ratings ? book.rating : 0,
    status: vis.status  ? book.status : '',
    blurb:  vis.blurb   ? book.blurb  : '',
    notes:  vis.notes   ? book.notes  : '',
  }
}

// ------------------------------------------------------- الأشخاص ودُور النشر
/**
 * صاحبُ ترجمةٍ ظاهر؟ المخفيُّ بعينه لا يُعرض، وتُخفى معه كتبُه
 * (`bookIsPublic`). أمّا من لم يبقَ له كتابٌ ظاهر ولا عملٌ في كتابٍ ظاهر
 * فيسقط من تلقائه، ويتكفّل به مُرشِّحُ `library.authors`.
 */
export function authorIsPublic(author: Doc<'authors'>, s: Settings): boolean {
  return !s.hidden_author_ids.includes(author._id)
}

/** اسمُ صاحب الترجمة لا يُخفى: بطاقتُه بلا اسمٍ ليست بطاقة */
export function redactAuthor(author: Doc<'authors'>, s: Settings) {
  const hidden = (field: string) => fieldHidden(
    field, author._id, s.hidden_author_fields,
    s.author_field_exceptions, s.author_field_overrides,
  )

  return {
    ...toClient(author),
    full_name: hidden('fullName') ? '' : author.full_name,
    birth:     hidden('birth')    ? null : author.birth,
    death:     hidden('death')    ? null : author.death,
    // الوفاةُ تُخفى بوجوهها كلِّها، وإلا دلّ التقريبُ على ما حُجب رقمُه
    alive:       hidden('death') ? false : author.alive,
    death_approx: hidden('death') ? false : author.death_approx,
    death_text:  hidden('death')  ? '' : author.death_text,
    bio:       hidden('bio')      ? '' : author.bio,
  }
}

export function publisherIsPublic(publisher: Doc<'publishers'>, s: Settings): boolean {
  return !s.hidden_publisher_ids.includes(publisher._id)
}

/** اسمُ الدار لا يُخفى من بطاقتها، وإنما يُخفى من بيانات الكتب */
export function redactPublisher(publisher: Doc<'publishers'>, s: Settings) {
  const hidden = (field: string) => fieldHidden(
    field, publisher._id, s.hidden_publisher_fields,
    s.publisher_field_exceptions, s.publisher_field_overrides,
  )

  return {
    ...toClient(publisher),
    place:    hidden('place')   ? '' : publisher.place,
    founded:  hidden('founded') ? '' : publisher.founded,
    website:  hidden('website') ? '' : publisher.website,
    notes:    hidden('notes')   ? '' : publisher.notes,
    logo_url: hidden('logo')    ? null : (publisher.logo_url ?? null),
  }
}

/**
 * الإعدادات كما يراها الزائر: قوائم المخفيّ لا تُنشر، فلا يعرف الزائر حتى أنّ
 * هناك ما هو مخفيّ. (العرض public_settings)
 */
export function redactSettings(s: Settings) {
  return {
    ...s,
    hidden_fields: [], hidden_categories: [], hidden_book_ids: [],
    field_exceptions: {}, book_field_overrides: {},
    hidden_author_ids: [], hidden_author_fields: [],
    author_field_exceptions: {}, author_field_overrides: {},
    hidden_publisher_ids: [], hidden_publisher_fields: [],
    publisher_field_exceptions: {}, publisher_field_overrides: {},
  }
}
