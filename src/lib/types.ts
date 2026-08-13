// أنواع البيانات والثوابت. الأسماء العربية هنا هي نصوص الإنتاج نفسها،
// وهي مطابقة لما في وثيقة التسليم — لا تُترجم ولا تُعاد صياغتها.

/** اسم المكتبة مضبوطًا بالشكل، كما يظهر في الرأس وفي وسط صفحة الهبوط */
export const LIBRARY_NAME = 'مكتبة سَيْف العشيرة'

/** موضع المكتبة، يظهر تحت اسمها في صفحة الهبوط */
export const LIBRARY_PLACE = 'أبها - حيُّ المُوظَّفين - شارع عَين جالوت'

export type Era = 'هـ' | 'م' | 'ق.هـ' | 'ق.م'
export type ReadingStatus = 'لم تُقرأ' | 'قيد القراءة' | 'تم القراءة'
export type PerkKind = 'فائدة' | 'مقتطف'
export type ViewMode = 'grid' | 'table' | 'shelf'
export type ThemeName = 'warm' | 'sepia' | 'dark'
export type FontName = 'kitab' | 'classic' | 'modern'

export const ERAS: Era[] = ['هـ', 'م', 'ق.هـ', 'ق.م']
export const STATUSES: ReadingStatus[] = ['لم تُقرأ', 'قيد القراءة', 'تم القراءة']
export const PERK_KINDS: PerkKind[] = ['فائدة', 'مقتطف']
export const LANGUAGES = ['العربية', 'مترجم إلى العربية', 'لغة أخرى']
export const BINDINGS = ['مُجلَّد كرتوني', 'تغليف ورقي مَرِن']
export const SIZES = ['قِطع كبير', 'حجم متوسط معتاد', 'حجم صغير', 'كُتيِّب']
export const CONDITIONS = ['جديد', 'جيد جدًّا', 'جيد', 'مستعمل', 'يحتاج ترميمًا']
export const SOURCES = ['شراء', 'هدية', 'إرث', 'معرض كتاب', 'مكتبة مستعملة']
export const CURRENCIES = ['ريال', 'درهم', 'دينار', 'دولار', 'يورو']
export const WORK_TYPES = [
  'شرح', 'حاشية', 'تهذيب', 'اختصار', 'ردّ',
  'تعليق', 'انتصار', 'فهرسة', 'انتقاء', 'استخراج',
]

export interface Author {
  id: string
  name: string
  full_name: string
  birth: number | null
  death: number | null
  era: Era
  bio: string
}

export interface Book {
  id: string
  title: string
  subtitle: string
  author_id: string | null
  author_name: string
  verifier: string
  translator: string
  presenter: string
  series: string
  series_no: string
  category: string
  room: string

  publisher: string
  place: string
  year: number | null
  year_era: Era
  edition: string
  parts: number | null
  volumes: number | null
  volume_pages: (number | string)[]
  pages: number | null
  size: string
  isbn: string
  language: string

  shelf_no: string
  binding: string
  condition: string
  source: string
  acquired_day: number | null
  acquired_month: number | null
  acquired_year: number | null
  value: number | null

  topic: string
  tags: string[]
  blurb: string
  notes: string
  status: ReadingStatus | ''
  rating: number

  cover_url: string | null
  spine_images: Record<string, string>
  use_spine: boolean
  created_at: string
}

export interface BookWork {
  id: string
  book_id: string
  target_book_id: string
  type: string
}

export interface Perk {
  id: string
  book_id: string
  kind: PerkKind
  title: string
  text: string
  page: string
  created_at: string
}

export interface Loan {
  id: string
  book_id: string
  borrower: string
  lent_date: string
  due_date: string | null
  returned: boolean
}

/** صورة خلفيّة في صفحة الهبوط. القائمة تدور كل `rotate_seconds`. */
export interface LandingImage {
  id: string
  image_url: string | null
  position: number
}

/** اقتباس في صفحة الهبوط. القائمة تدور كل `quote_seconds`، مستقلّةً عن الصور. */
export interface LandingQuote {
  id: string
  text: string
  author: string
  position: number
}

export interface Visibility {
  status: boolean
  ratings: boolean
  notes: boolean
  blurb: boolean
  perks: boolean
  loans: boolean
  value: boolean
  stats: boolean
  authors: boolean
  advSearch: boolean
}

export interface Settings {
  theme: ThemeName
  font: FontName
  ui_scale: number
  show_status_dots: boolean
  show_ratings: boolean
  default_view: ViewMode
  currency: string
  landing_title: string
  landing_tagline: string
  landing_intro: string
  show_landing_stats: boolean
  show_landing_quote: boolean
  auto_rotate: boolean
  /** مهلة تبديل صور الخلفية */
  rotate_seconds: number
  /** مهلة تبديل الاقتباسات */
  quote_seconds: number
  /** نصّ صفحة «عن المكتبة»، فقراتٌ يفصلها سطرٌ فارغ */
  about_text: string
  x_url: string
  telegram_url: string
  visibility: Visibility
  /** لا تصل هذه القوائم إلى الزائر أصلًا؛ تبقى فارغة عنده */
  hidden_fields: string[]
  hidden_categories: string[]
  hidden_book_ids: string[]
}

export const DEFAULT_VISIBILITY: Visibility = {
  status: true, ratings: true, notes: false, blurb: true, perks: true,
  loans: false, value: false, stats: true, authors: true, advSearch: true,
}

/** مفاتيح «ما يراه الزوار» (§٦-أ) */
export const VIS_TOGGLES: { key: keyof Visibility; label: string; hint: string }[] = [
  { key: 'status',    label: 'حالة القراءة',        hint: 'ما قرأتَه وما لم تقرأه' },
  { key: 'ratings',   label: 'تقييماتي',            hint: 'النجوم في البطاقات والصفحات' },
  { key: 'notes',     label: 'ملاحظاتي الشخصية',    hint: 'ما تكتبه لنفسك في صفحة الكتاب' },
  { key: 'blurb',     label: 'نبذة الكتاب',         hint: 'التعريف الموجز بالكتاب' },
  { key: 'perks',     label: 'الفوائد والمقتطفات',  hint: 'ما استخرجتَه من الكتب' },
  { key: 'loans',     label: 'سجل الإعارة',         hint: 'من استعار وما زال عنده' },
  { key: 'value',     label: 'قيمة الكتاب',         hint: 'الأثمان وقيمة المكتبة' },
  { key: 'stats',     label: 'صفحة الإحصائيات',     hint: 'الأرقام العامة للمكتبة' },
  { key: 'authors',   label: 'صفحات المؤلِّفين',     hint: 'التراجم ومؤلَّفات كل واحد' },
  { key: 'advSearch', label: 'البحث المتقدِّم',       hint: 'خصائص المطابقة واختيار الحقول' },
]

/**
 * صفوف «بيانات الكتاب» في صفحة الكتاب، بترتيبها المعتمد (§٥-٣).
 * المفتاح `key` هو ما يُخزَّن في hidden_fields، وليس اسم العمود.
 */
export const META_DEFS: { label: string; key: string }[] = [
  { label: 'العنوان الفرعي',   key: 'subtitle' },
  { label: 'المحقق',           key: 'verifier' },
  { label: 'المترجم',          key: 'translator' },
  { label: 'المُقدِّم',          key: 'presenter' },
  { label: 'السلسلة',          key: 'series' },
  { label: 'رقمه في السلسلة',  key: 'seriesNo' },
  { label: 'الناشر',           key: 'publisher' },
  { label: 'مكان النشر',       key: 'place' },
  { label: 'سنة النشر',        key: 'yearLabel' },
  { label: 'الطبعة',           key: 'edition' },
  { label: 'الأجزاء',          key: 'parts' },
  { label: 'المجلدات المادية', key: 'volumes' },
  { label: 'عدد الصفحات',      key: 'pages' },
  { label: 'صفحات المجلدات',   key: 'volumePagesText' },
  { label: 'الحجم',            key: 'size' },
  { label: 'ردمك',             key: 'isbn' },
  { label: 'اللغة',            key: 'language' },
  { label: 'موضع الرف',        key: 'shelfNo' },
  { label: 'التغليف',          key: 'binding' },
  { label: 'الحالة المادية',   key: 'condition' },
  { label: 'مصدر الاقتناء',    key: 'source' },
  { label: 'تاريخ الاقتناء',   key: 'acquired' },
  { label: 'الموضوع',          key: 'topic' },
]

export const SORT_OPTIONS = [
  { key: 'authorDeath', label: 'ترتيب: أقدمية المؤلِّف' },
  { key: 'title',       label: 'ترتيب: العنوان' },
  { key: 'author',      label: 'ترتيب: المؤلف' },
  { key: 'year',        label: 'ترتيب: الأحدث نشرًا' },
  { key: 'rating',      label: 'ترتيب: الأعلى تقييمًا' },
  { key: 'pages',       label: 'ترتيب: الأكثر صفحات' },
  { key: 'value',       label: 'ترتيب: الأعلى قيمة' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['key']

/** ألوان كعوب الأرفف بحسب التصنيف، وما عداها يأخذ لون التمييز */
export const CATEGORY_SPINE: Record<string, string> = {
  'أدب عربي':   'oklch(0.42 0.09 45)',
  'أدب عالمي':  'oklch(0.4 0.07 250)',
  'تاريخ':      'oklch(0.38 0.1 25)',
  'فلسفة':      'oklch(0.4 0.05 150)',
  'علوم':       'oklch(0.45 0.07 230)',
  'سيرة ذاتية': 'oklch(0.5 0.09 80)',
}

export const STATUS_DOT: Record<string, string> = {
  'تم القراءة':  'oklch(0.5 0.1 150)',
  'قيد القراءة': 'oklch(0.6 0.14 70)',
  'لم تُقرأ':     'oklch(0.65 0.01 60)',
}

/** تحويل الأرقام العربية والفارسية إلى لاتينية (§١١/٦) */
export function toLatinDigits(input: string): string {
  return String(input ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

/** يقرأ عددًا من حقل نصّي يقبل الرقمين العربي واللاتيني؛ الفارغ = null */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null
  const n = Number(toLatinDigits(String(input)).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** نجوم التقييم كنصّ: ★★★☆☆ أو «—» حين لا تقييم */
export function starsText(rating: number): string {
  return rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '—'
}

/** عدد المجلدات المادية المعروضة على الرف، بحدٍّ أقصى ٤٠ كعبًا */
export function volumesOf(book: Pick<Book, 'volumes'>): number {
  return Math.min(40, Math.max(1, book.volumes ?? 1))
}
