// أنواع البيانات والثوابت. الأسماء العربية هنا هي نصوص الإنتاج نفسها،
// وهي مطابقة لما في وثيقة التسليم — لا تُترجم ولا تُعاد صياغتها.

/** اسم المكتبة مضبوطًا بالشكل، كما يظهر في الرأس وفي وسط صفحة الهبوط */
export const LIBRARY_NAME = 'مكتبة سَيْف العشيرة'

/** موضع المكتبة، يظهر تحت اسمها في صفحة الهبوط */
export const LIBRARY_PLACE = 'أبها - حيُّ المُوظَّفين - شارع عَين جالوت'

export type Era = 'هـ' | 'م' | 'ق.هـ' | 'ق.م'
export type ReadingStatus = 'لم يُقرأ' | 'قيد القراءة' | 'مقروء'
export type PerkKind = 'فائدة' | 'مقتطف'
export type ViewMode = 'grid' | 'table' | 'shelf'
export type ThemeName = 'warm' | 'sepia' | 'dark'
export type FontName = 'kitab' | 'classic' | 'modern'

export const ERAS: Era[] = ['هـ', 'م', 'ق.هـ', 'ق.م']
export const STATUSES: ReadingStatus[] = ['لم يُقرأ', 'قيد القراءة', 'مقروء']

/** ما يُعرض حين لا حالة للكتاب. الفراغ هو ما يُخزَّن، وهذا لفظُه. */
export const STATUS_UNKNOWN = 'غير معروفة'
export const PERK_KINDS: PerkKind[] = ['فائدة', 'مقتطف']
export const LANGUAGES = ['العربية', 'مُترجَمٌ إلى العربية', 'لغةٌ أخرى']

/** لغة الأصل، تُسأل حين يكون الكتاب مترجَمًا. فيها القديم كما فيها الحيّ. */
export const ORIGINAL_LANGUAGES = [
  'الإنجليزية', 'الفرنسية', 'الألمانية', 'الإسبانية', 'الإيطالية', 'البرتغالية',
  'الهولندية', 'الروسية', 'التركية', 'الفارسية', 'الأردية', 'الهندية',
  'الصينية', 'اليابانية', 'الكورية', 'الملايوية', 'الإندونيسية', 'السواحيلية',
  'العبرية', 'الأمازيغية',
  'اللاتينية', 'اليونانية القديمة', 'السريانية', 'الآرامية', 'القبطية',
  'الفَهْلَوية', 'السنسكريتية', 'الأكادية',
]

/**
 * أدوار من عمل في الكتاب غير مؤلِّفه. الافتراضيّ «المُحقِّق»، وقد يجتمع في
 * الكتاب الواحد محقِّقان ومخرِّجٌ وثلاثة تقديمات.
 */
export const CONTRIBUTOR_ROLES = [
  'المُحقِّق', 'المُراجِع', 'المُعتَني', 'المُصحِّح', 'المُخَرِّج', 'المُتَرجِم',
  'تَقْرِيظ', 'تقديم',
]

/**
 * الصفة مُثنّاةً ومجموعةً: إذا اجتمع في الكتاب اثنان من صفةٍ واحدة ثُنِّي
 * لفظُها، وإن زادوا جُمِع. و«تَقْرِيظ» و«تقديم» مصدران لا وصفان، فلا
 * يُثنَّيان ولا يُجمعان مهما كثر أصحابُهما — يلزمان لفظهما كما هو.
 */
export const CONTRIBUTOR_FORMS: Record<string, { two: string; many: string }> = {
  'المُحقِّق':  { two: 'المُحقِّقان',  many: 'المُحقِّقون' },
  'المُراجِع':  { two: 'المُراجِعان',  many: 'المُراجِعون' },
  'المُعتَني':  { two: 'المُعتَنِيان', many: 'المُعتَنُون' },
  'المُصحِّح':  { two: 'المُصحِّحان',  many: 'المُصحِّحون' },
  'المُخَرِّج': { two: 'المُخَرِّجان', many: 'المُخَرِّجون' },
  'المُتَرجِم': { two: 'المُتَرجِمان', many: 'المُتَرجِمون' },
}

/** لفظ الصفة موافقًا لعدد أصحابها */
export function contributorLabel(role: string, count: number): string {
  const forms = CONTRIBUTOR_FORMS[role]
  if (!forms || count < 2) return role
  return count === 2 ? forms.two : forms.many
}

/**
 * الصفة في سياق العدّ: «المُحقِّقون» جمعًا. و«تَقْرِيظ» و«تقديم» مصدران لا
 * يُجمعان، فيُعدَل عنهما إلى صلةٍ تصحّ: «مَن قرَّظ».
 */
const ROLE_GROUP: Record<string, string> = {
  'تَقْرِيظ': 'مَن قرَّظ',
  'تقديم': 'مَن قدَّم',
}

/** ما يُعنوَن به عددُ أصحاب الصفة في الإحصائيات */
export function roleGroupLabel(role: string): string {
  return ROLE_GROUP[role] ?? CONTRIBUTOR_FORMS[role]?.many ?? role
}

export const BINDINGS = ['مُجلَّد كرتوني', 'تغليف ورقي مَرِن']
export const SIZES = ['قِطع كبير', 'حجم متوسط معتاد', 'حجم صغير', 'كُتيِّب']

/** الحالة المادِّيَّة، من الأعلى إلى الأدنى */
export const CONDITIONS = ['جديد', 'ممتاز', 'جيد جدًّا', 'جيد', 'مستعمل', 'يحتاج ترميمًا']

/** ما تُفتح عليه الحالة في نموذجٍ جديد. مكتوبٌ لفظًا لا برقم موضعه في القائمة. */
export const DEFAULT_CONDITION = 'جيد جدًّا'

/** صِفة الوُرُود: بأيّ صفةٍ وَرَد هذا الكتاب إلى المكتبة. والفراغ: لم تُحدَّد. */
export const SOURCES = ['شِراء', 'إِهْداء', 'إرْث', 'توزيع', 'تنازُل']

/** ما يستدعيه كلُّ صفةِ ورودٍ من سؤالٍ بعده. وما ليس فيها لا يستدعي شيئًا. */
export const SOURCE_DETAILS: Record<string, string> = {
  'شِراء': 'مكان الشِّراء',
  'إِهْداء': 'المُهدِي',
  'إرْث': 'المَوْروث',
}
export const CURRENCIES = ['ريال', 'درهم', 'دينار', 'دولار', 'يورو']
export const WORK_TYPES = [
  'شرح', 'حاشية', 'تهذيب', 'اختصار', 'ردّ',
  'تعليق', 'انتصار', 'فهرسة', 'انتقاء', 'استخراج',
]

/**
 * صياغة نوع العمل في الجملة، وحرفُ جرِّه معه: «هذا الكتاب شرحٌ لـ…»،
 * «حاشيةٌ على…»، «انتقاءٌ من…». الحرف يتبع اللفظ ولا يُقاس، فيُكتب هنا.
 */
export const WORK_PHRASES: Record<string, string> = {
  'شرح':     'شرحٌ لـ',
  'حاشية':   'حاشيةٌ على',
  'تهذيب':   'تهذيبٌ لـ',
  'اختصار':  'اختصارٌ لـ',
  'ردّ':      'ردٌّ على',
  'تعليق':   'تعليقٌ على',
  'انتصار':  'انتصارٌ لـ',
  'فهرسة':   'فهرسةٌ لـ',
  'انتقاء':  'انتقاءٌ من',
  'استخراج': 'استخراجٌ من',
}

export interface Author {
  id: string
  name: string
  full_name: string
  birth: number | null
  death: number | null
  era: Era
  /** معاصرٌ حيّ، فلا وفاة له */
  alive: boolean
  /** وفاةٌ لم تُعرف على التعيين، تُكتب نصًّا في `death_text` */
  death_approx: boolean
  death_text: string
  bio: string
}

/** مؤلِّفٌ مشارك: الأول في `author_id`، وهؤلاء من بعده */
export interface CoAuthor {
  author_id: string | null
  name: string
}

/**
 * من عمل في الكتاب غير مؤلِّفه، ودورُه معه. وقد يختلف القائمون على مجلَّدات
 * الكتاب الواحد — محقِّقُ الأول غيرُ محقِّق الثاني — فلكلٍّ نطاقُه نصًّا،
 * والفراغُ فيه معناه: عمل في الكتاب كلِّه.
 */
export interface Contributor {
  role: string
  name: string
  /** ما عمل فيه من المجلَّدات أو الأسفار: «١-٣»، «السِّفر الأول». */
  scope?: string
  /**
   * صاحبُ الاسم في سجلّ الأشخاص — وهو جدول المؤلِّفين نفسه. فالمحقِّق قد
   * يكون مؤلِّفًا، فتُجمع تحقيقاتُه ومؤلَّفاتُه في صفحةٍ واحدة.
   */
  person_id?: string | null
}

/** مجلَّدٌ ناقص من الطبعة: رقمُه وسببُ فقده، والسببُ يجوز أن يُترك */
export interface MissingVolume {
  no: number
  reason: string
}

/** أسبابُ فقد المجلَّد، وهي اقتراحٌ لا حصر — يُكتب غيرُها */
export const MISSING_REASONS = ['تَلَف', 'ضَياع', 'إعارةٌ لم تُردّ', 'لم يُشترَ بعدُ', 'نفِد من السوق']

/** تصنيفٌ في المكتبة: رئيسٌ بلا `parent`، أو فرعٌ تحت رئيسه */
export interface Category {
  name: string
  /** اسم التصنيف الرئيس، أو فراغٌ إن كان هو الرئيس */
  parent: string
}

export interface Publisher {
  id: string
  name: string
  place: string
  founded: string
  website: string
  notes: string
  /** شعار الدار، يُرفع من صفحتها */
  logo_url: string | null
  created_at: string
}

export interface Book {
  id: string
  title: string
  subtitle: string
  author_id: string | null
  author_name: string
  co_authors: CoAuthor[]
  contributors: Contributor[]
  series: string
  series_no: string
  category: string
  /** التصنيف الفرعيّ داخل الرئيسيّ، إن كان له فرع */
  sub_category: string

  publisher_id: string | null
  publisher: string
  place: string
  year: number | null
  year_month: number | null
  year_era: Era
  year_approx: boolean
  year_text: string
  edition: string
  edition_worded: boolean
  edition_notes: string
  parts: number | null
  single_part: boolean
  volumes: number | null
  single_volume: boolean
  volume_pages: (number | string)[]
  /** ما اشتمل عليه كل مجلَّد من أسفار المؤلِّف، نصًّا: «٥-٧»، «الثامن» */
  volume_parts: string[]
  /** أرقام مجلَّدات الفهارس، لا تدخل صفحاتُها في الإجمالي */
  index_volumes: number[]
  /** ما نقص من مجلَّدات الطبعة، لكلٍّ رقمُه وسببُ فقده */
  missing_volumes: MissingVolume[]
  pages: number | null
  size: string
  isbn: string
  language: string
  language_original: string

  cabinet_no: string
  shelf_no: string
  binding: string
  condition: string
  /** ما يُوصف به حال النسخة على التفصيل: أثرُ رطوبةٍ، أو خرمٌ في مجلَّد… */
  condition_notes: string
  source: string
  source_detail: string
  /** يوم الوُرود. الطبعةُ لا يُعرف يومُها، أمّا الوُرود فيُعرف. */
  acquired_day: number | null
  acquired_month: number | null
  acquired_year: number | null
  acquired_approx: boolean
  acquired_text: string
  margin_note: string
  value: number | null

  topic: string
  tags: string[]
  /** كلماتٌ يُهتدى بها إلى الكتاب في البحث، لا تُعرض وسومًا */
  keywords: string[]
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

  /** موضع المكتبة، يظهر في صفحة الهبوط وفي «عن المكتبة» جميعًا */
  show_landing_place: boolean
  /** حاسبة القراءة في صفحة التصفُّح — لصاحب المكتبة أبدًا، وللزائر بهذا */
  show_calculator: boolean

  /** مفتاحُه اسمُ الحقل، وقيمتُه معرّفاتُ الكتب المستثناة من إخفائه */
  field_exceptions: FieldMap
  /** مفتاحُه معرّفُ الكتاب، وقيمتُه حقولٌ تُخفى منه وحده */
  book_field_overrides: FieldMap

  hidden_author_ids: string[]
  hidden_author_fields: string[]
  author_field_exceptions: FieldMap
  author_field_overrides: FieldMap

  hidden_publisher_ids: string[]
  hidden_publisher_fields: string[]
  publisher_field_exceptions: FieldMap
  publisher_field_overrides: FieldMap
}

/** خريطةٌ من مفتاحٍ إلى معرّفات: قوائمُ الاستثناء وقوائمُ حقول المستند الواحد */
export type FieldMap = Record<string, string[]>

/**
 * الإخفاء على ثلاث درجات، وهذا حكمُها مرتَّبًا: ما أُخفي من مستندٍ بعينه
 * مخفيٌّ وإن لم يُخفَ من نوعه، وما أُخفي من النوع كلِّه مخفيٌّ إلا أن يُستثنى
 * هذا المستند منه. تُستعمل في الواجهة، ونظيرُها في `convex/privacy.ts` هو
 * الحاكم — الخصوصية في الخادم لا في المتصفّح.
 */
export function isFieldHidden(
  field: string, docId: string,
  all: string[], exceptions: FieldMap, overrides: FieldMap,
): boolean {
  if ((overrides[docId] ?? []).includes(field)) return true
  if (!all.includes(field)) return false
  return !(exceptions[field] ?? []).includes(docId)
}


export const DEFAULT_VISIBILITY: Visibility = {
  status: true, ratings: true, notes: false, blurb: true, perks: true,
  loans: false, value: false, stats: true, authors: true, advSearch: true,
}

/**
 * ما استُجدّ من حقول الإعدادات. هي اختياريّة في المخطّط — مستندُ الإعدادات
 * واحدٌ قائمٌ من قبلها — فقد يعود بلا بعضها، فيُسدّ الناقص من هنا كي لا تصل
 * الواجهةَ قائمةٌ غيرُ معرَّفة.
 */
export const DEFAULT_SETTINGS_EXTRAS = {
  show_landing_place: true,
  show_calculator: true,
  field_exceptions: {} as FieldMap,
  book_field_overrides: {} as FieldMap,
  hidden_author_ids: [] as string[],
  hidden_author_fields: [] as string[],
  author_field_exceptions: {} as FieldMap,
  author_field_overrides: {} as FieldMap,
  hidden_publisher_ids: [] as string[],
  hidden_publisher_fields: [] as string[],
  publisher_field_exceptions: {} as FieldMap,
  publisher_field_overrides: {} as FieldMap,
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
  { label: 'المحقِّق ونحوه',     key: 'contributors' },
  { label: 'السلسلة',          key: 'series' },
  { label: 'رقمه في السلسلة',  key: 'seriesNo' },
  { label: 'دار النشر',        key: 'publisher' },
  { label: 'بلد النشر',        key: 'place' },
  { label: 'سنة النشر',        key: 'yearLabel' },
  { label: 'الطبعة',           key: 'edition' },
  { label: 'الأجزاء',          key: 'parts' },
  { label: 'المجلدات',         key: 'volumes' },
  { label: 'عدد الصفحات',      key: 'pages' },
  { label: 'صفحات المجلدات',   key: 'volumePagesText' },
  { label: 'الحجم',            key: 'size' },
  { label: 'ردمك',             key: 'isbn' },
  { label: 'اللغة',            key: 'language' },
  { label: 'رقم الدولاب',      key: 'cabinet' },
  { label: 'رقم الرفّ',         key: 'shelfNo' },
  { label: 'التغليف',          key: 'binding' },
  { label: 'الحالة المادية',   key: 'condition' },
  { label: 'ملاحظات الحالة',   key: 'conditionNotes' },
  { label: 'صِفة الوُرود',       key: 'source' },
  { label: 'تاريخ الوُرود',     key: 'acquired' },
  { label: 'طُرَّة الكتاب',      key: 'marginNote' },
  { label: 'الموضوع',          key: 'topic' },
]

/**
 * حقول الكتاب التي يجوز إخفاؤها: صفوفُ بطاقته، ومعها ما ليس صفًّا — التصنيف
 * والوُسوم والصورتان. وليس فيها العنوان ولا اسم المؤلِّف: إخفاؤهما يُفسد
 * الفائدة من الفهرس أصلًا، فلا يُعرَضان للإخفاء.
 */
export const BOOK_PRIVACY_FIELDS: { label: string; key: string }[] = [
  ...META_DEFS,
  { label: 'التصنيف',            key: 'category' },
  { label: 'الوُسوم',             key: 'tags' },
  { label: 'المجلَّدات الناقصة',   key: 'missingVolumes' },
  { label: 'صورة الغلاف',        key: 'cover' },
  { label: 'صورة الكَعْب',        key: 'spine' },
]

/** حقول صاحب الترجمة التي يجوز إخفاؤها. واسمُه ليس منها. */
export const AUTHOR_PRIVACY_FIELDS: { label: string; key: string }[] = [
  { label: 'الاسم الكامل ونسبه', key: 'fullName' },
  { label: 'سنة المولد',         key: 'birth' },
  { label: 'سنة الوفاة',         key: 'death' },
  { label: 'النبذة',             key: 'bio' },
]

/** حقول الدار التي يجوز إخفاؤها. واسمُها ليس منها. */
export const PUBLISHER_PRIVACY_FIELDS: { label: string; key: string }[] = [
  { label: 'بلدها',        key: 'place' },
  { label: 'سنة التأسيس',  key: 'founded' },
  { label: 'موقعها',       key: 'website' },
  { label: 'ملاحظاتٌ عنها', key: 'notes' },
  { label: 'شعارها',       key: 'logo' },
]

export const SORT_OPTIONS = [
  { key: 'authorDeath', label: 'ترتيب حسَب القِدَم' },
  { key: 'title',       label: 'حسَب ترتيب حروف المُعجَم' },
  { key: 'newest',      label: 'حسَب الأحدث إضافةً' },
  { key: 'rating',      label: 'حسَب الأعلى تقييمًا' },
  { key: 'volumes',     label: 'حسَب عدد المُجلَّدات' },
  { key: 'pages',       label: 'حسَب عدد الصفَحات' },
  { key: 'value',       label: 'حسَب قيمة الكتاب' },
  { key: 'year',        label: 'حسَب تاريخ النشْر' },
] as const

/** أسماء طرق العرض كما تظهر في زرّ طريقة العرض */
export const VIEW_OPTIONS: { key: ViewMode; label: string }[] = [
  { key: 'table', label: 'عرض في صورة جدول' },
  { key: 'grid',  label: 'عرض في صورة شبكة' },
  { key: 'shelf', label: 'عرض في صورة أَرْفُف' },
]

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
  'مقروء':       'oklch(0.5 0.1 150)',
  'قيد القراءة': 'oklch(0.6 0.14 70)',
  'لم يُقرأ':     'oklch(0.65 0.01 60)',
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

const EDITION_ONES = [
  '', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة',
  'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة',
]
const EDITION_ONES_BOUND = [
  '', 'الحادية', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة',
  'السادسة', 'السابعة', 'الثامنة', 'التاسعة',
]
const EDITION_TENS = [
  '', '', 'العشرون', 'الثلاثون', 'الأربعون', 'الخمسون',
  'الستون', 'السبعون', 'الثمانون', 'التسعون',
]

/**
 * رقم الطبعة كتابةً: ٢ ← «الثانية»، ٢١ ← «الحادية والعشرون». مؤنَّثةٌ لأن
 * الموصوف «الطبعة». وما جاوز التسع والتسعين يبقى رقمًا كما كُتب.
 */
export function editionInWords(input: string | number): string {
  const n = parseNumber(input)
  if (n === null || !Number.isInteger(n) || n < 1 || n > 99) return String(input ?? '').trim()
  if (n <= 10) return EDITION_ONES[n]
  if (n < 20) return `${EDITION_ONES_BOUND[n - 10]} عشرة`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones === 0
    ? EDITION_TENS[tens]
    : `${EDITION_ONES_BOUND[ones]} و${EDITION_TENS[tens]}`
}

/**
 * عددٌ يُعرض بفاصلةٍ بين كل ثلاث مراتب: ١١٣٠ ← «1,130». الأعدادُ الكبيرة —
 * وأكثرُها صفحات — لا تُقرأ بنظرةٍ واحدة بغير هذا الفصل.
 */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return ''
  return Number(n).toLocaleString('en-US')
}

/**
 * تمييزُ المعدود في العربية. «١ كتابًا» لحنٌ، والصواب «كتابٌ واحد»؛ وما بين
 * الثلاثة والعشرة جمعُ قلّةٍ مجرور، وما جاوزها مفردٌ منصوب. فلا يُوصل عددٌ
 * باسمٍ في هذه الواجهة إلا من هنا.
 */
export interface CountForms {
  /** حين لا شيء: «لا كتاب» */
  none: string
  /** الواحد: «كتابٌ واحد» */
  one: string
  /** الاثنان: «كتابان» */
  two: string
  /** ٣–١٠: «كتبٍ» */
  few: string
  /** ١١ فصاعدًا: «كتابًا» */
  many: string
}

export function countLabel(n: number, forms: CountForms): string {
  if (!Number.isFinite(n) || n <= 0) return forms.none
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  if (n <= 10) return `${formatNumber(n)} ${forms.few}`
  return `${formatNumber(n)} ${forms.many}`
}

export const BOOKS_COUNT: CountForms = {
  none: 'لا كتاب', one: 'كتابٌ واحد', two: 'كتابان', few: 'كتبٍ', many: 'كتابًا',
}

export const VOLUMES_COUNT: CountForms = {
  none: 'لا مجلَّد', one: 'مجلَّدٌ واحد', two: 'مجلَّدان',
  few: 'مجلَّداتٍ', many: 'مجلَّدًا',
}

export const AUTHORS_COUNT: CountForms = {
  none: 'لا مؤلِّف', one: 'مؤلِّفٌ واحد', two: 'مؤلِّفان',
  few: 'مؤلِّفين', many: 'مؤلِّفًا',
}

export const PERKS_COUNT: CountForms = {
  none: 'لا فائدة', one: 'فائدةٌ واحدة', two: 'فائدتان', few: 'فوائدَ', many: 'فائدةً',
}

export const QUOTES_COUNT: CountForms = {
  none: 'لا مقتطف', one: 'مقتطفٌ واحد', two: 'مقتطفان', few: 'مقتطفاتٍ', many: 'مقتطفًا',
}

export const CATEGORIES_COUNT: CountForms = {
  none: 'لا تصنيف', one: 'تصنيفٌ واحد', two: 'تصنيفان', few: 'تصنيفاتٍ', many: 'تصنيفًا',
}

export const FIELDS_COUNT: CountForms = {
  none: 'لا حقل', one: 'حقلٌ واحد', two: 'حقلان', few: 'حقولٍ', many: 'حقلًا',
}

/** «كتابٌ واحد» و«٣ كتبٍ» و«١٢ كتابًا» — أكثر ما يُعدّ في هذه الواجهة */
export function booksLabel(n: number): string {
  return countLabel(n, BOOKS_COUNT)
}

/**
 * مجموع صفحات المجلَّدات، ناقصًا مجلَّدات الفهارس: فهرسٌ لا متن، فلا تُعدّ
 * صفحاتُه في صفحات الكتاب. `indexVolumes` أرقام المجلَّدات بدءًا من ١.
 */
export function sumVolumePages(
  pages: (number | string)[], indexVolumes: number[] = [],
): number {
  return pages.reduce<number>((sum, v, i) => {
    if (indexVolumes.includes(i + 1)) return sum
    return sum + (parseNumber(v) ?? 0)
  }, 0)
}

/** حروف الهجاء كما تُرتَّب في الفهارس، لشريط الحروف في صفحة التصفُّح */
export const ARABIC_LETTERS = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض',
  'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
]

/**
 * الحرف الذي يُفهرَس تحته العنوان: تُطرح «ال» التعريف كما يصنع الفهارسة —
 * «الرسالة» في الراء لا في الألف — وتُوحَّد الهمزات والتاء المربوطة.
 */
export function titleInitial(title: string): string {
  const clean = String(title ?? '')
    .replace(/[ً-ْٰـ]/g, '')             // تشكيلٌ وتطويل
    .replace(/^[^ء-ي]+/, '')   // ما تصدَّر من علاماتٍ وأرقام
    .replace(/^ال(?=.{2})/, '')          // «ال» التعريف، ما بقي بعدها اسم
    .trim()
  const first = clean[0] ?? ''
  return first
    .replace(/[أإآٱ]/, 'ا')
    .replace(/ة/, 'ه')
    .replace(/ى/, 'ي')
}

// العدد الترتيبيّ مذكَّرًا. وله موضعان: القرنُ والمجلَّد، وكلاهما مذكَّر —
// بخلاف الطبعة، فهي مؤنَّثة ولها صيغُها في `editionInWords`.
const ORDINAL_ONES = [
  '', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
]
const ORDINAL_ONES_BOUND = [
  '', 'الحادي', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع',
]
const ORDINAL_TENS = [
  '', '', 'العشرون', 'الثلاثون', 'الأربعون', 'الخمسون',
  'الستون', 'السبعون', 'الثمانون', 'التسعون',
]

/**
 * العدد الترتيبيّ مذكَّرًا: ٢ ← «الثاني»، ١٢ ← «الثاني عشر»، ٢٦ ← «السادس
 * والعشرون». وما جاوز التسعةَ والتسعين بقي رقمًا كما هو.
 */
export function ordinalName(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return toArabicNumerals(n)
  if (n <= 10) return ORDINAL_ONES[n]
  if (n < 20) return `${ORDINAL_ONES_BOUND[n - 10]} عشر`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones === 0
    ? ORDINAL_TENS[tens]
    : `${ORDINAL_ONES_BOUND[ones]} و${ORDINAL_TENS[tens]}`
}

/** الرقم بالأرقام العربية الهندية، لِما لا يُصاغ ترتيبًا */
function toArabicNumerals(n: number): string {
  return String(n).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))
}

/** «القرن الثامن» من رقمه */
export function centuryName(n: number): string {
  return `القرن ${ordinalName(n)}`
}

// -------------------------------------------------- المجلَّدات الناقصة
/** «المجلَّد الثاني (تَلَف)»، وبلا سببٍ: «المجلَّد الثاني (ناقص)» */
export function missingVolumeLabel(m: MissingVolume): string {
  const reason = m.reason.trim() || 'ناقص'
  return `المجلَّد ${ordinalName(m.no)} (${reason})`
}

/**
 * خبرُ النقص جملةً تامّة، والعددُ فيها مُطابِقٌ لمعدوده: «ناقصٌ منه مجلَّدٌ
 * واحد»، «ناقصان منه»، «ناقصةٌ منه ٣ مجلَّداتٍ». فالمفردُ يُذكَّر، والاثنان
 * يُثنَّى الوصفُ لهما، وما جاوزهما جمعُ ما لا يعقل فيُؤنَّث وصفُه.
 */
export function missingVolumesHeadline(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return 'ناقصٌ منه مجلَّدٌ واحد'
  if (count === 2) return 'ناقصان منه'
  return `ناقصةٌ منه ${countLabel(count, VOLUMES_COUNT)}`
}

// ------------------------------------------------------ تمام الفهرسة
/**
 * حقول البطاقة المعتمدة، وبها يُقاس تمامُ فهرسة الكتاب. مفاتيحُها مفاتيحُ
 * `META_DEFS` نفسها، ومعها الغلافُ والنبذةُ والتصنيف — وهي من بياناته وإن
 * لم تكن صفوفًا في جدوله. وكلُّها بوزنٍ واحد.
 *
 * والعنوانُ واسمُ المؤلِّف خارجَ الحساب: لا يُحفظ كتابٌ بغيرهما أصلًا، فعدُّهما
 * يرفع النسبة على كل كتابٍ بقدرٍ واحد فلا يُفرِّق بين تامٍّ وناقص.
 */
/**
 * حارسُ النصّ. حقولُ المخطّط المستجدّة تُعرَّف اختياريّةً بالضرورة — الكتابُ
 * المفهرَس قبلها لا يحملها، وإلزامُها يُفشل تحقّقَ المخطّط على مستنداته. فما
 * يقرؤه صاحبُ المكتبة من مستندٍ خام قد يأتي فيه الحقلُ `undefined`، ونداءُ
 * `.trim()` عليه يرمي استثناءً في أثناء الرسم.
 *
 * وقد وقع: `condition_notes` اختياريّ، وهذه الشارةُ لصاحب المكتبة وحده —
 * فكانت كلُّ كتبه المفهرَسة قبل ذلك الحقل تُسقط صفحةَ التصفُّح كلَّها. فلا
 * يُقرأ نصٌّ هنا إلا من خلاله، اختياريًّا كان أو لازمًا اليوم.
 */
const filled = (v: string | null | undefined) => !!(v ?? '').trim()

const CATALOG_FILLED: Record<string, (b: Book) => boolean> = {
  subtitle:        (b) => filled(b.subtitle),
  contributors:    (b) => (b.contributors ?? []).some((c) => filled(c.name)),
  series:          (b) => filled(b.series),
  seriesNo:        (b) => filled(b.series_no),
  publisher:       (b) => filled(b.publisher),
  place:           (b) => filled(b.place),
  yearLabel:       (b) => b.year != null || filled(b.year_text),
  edition:         (b) => filled(b.edition),
  parts:           (b) => b.single_part || (b.parts ?? 0) > 0,
  volumes:         (b) => b.single_volume || (b.volumes ?? 0) > 0,
  pages:           (b) => (b.pages ?? 0) > 0,
  volumePagesText: (b) => (b.volume_pages ?? []).some((v) => (parseNumber(v) ?? 0) > 0),
  size:            (b) => filled(b.size),
  isbn:            (b) => filled(b.isbn),
  language:        (b) => filled(b.language),
  cabinet:         (b) => filled(b.cabinet_no),
  shelfNo:         (b) => filled(b.shelf_no),
  binding:         (b) => filled(b.binding),
  condition:       (b) => filled(b.condition),
  conditionNotes:  (b) => filled(b.condition_notes),
  source:          (b) => filled(b.source),
  acquired:        (b) => b.acquired_year != null || filled(b.acquired_text),
  marginNote:      (b) => filled(b.margin_note),
  topic:           (b) => filled(b.topic),
  cover:           (b) => !!b.cover_url,
  blurb:           (b) => filled(b.blurb),
  category:        (b) => filled(b.category),
}

const CATALOG_KEYS = Object.keys(CATALOG_FILLED)

export interface CatalogScore {
  /** ما أُدخل من الحقول */
  filled: number
  total: number
  /** نسبةُ ما أُدخل، من مئة */
  percent: number
  /** نسبةُ ما بقي، وهي التي تُعرض: «ناقصٌ ٤٠٪» */
  missing: number
}

/** مقدارُ ما أُدخل من بيانات الكتاب وما بقي، نسبةً مئوية */
export function catalogScore(book: Book): CatalogScore {
  const filled = CATALOG_KEYS.reduce((n, key) => n + (CATALOG_FILLED[key](book) ? 1 : 0), 0)
  const total = CATALOG_KEYS.length
  const percent = Math.round((filled / total) * 100)
  return { filled, total, percent, missing: 100 - percent }
}

/** نجوم التقييم كنصّ: ★★★☆☆ أو «—» حين لا تقييم */
export function starsText(rating: number): string {
  return rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '—'
}

/** عدد المجلدات المادية المعروضة على الرف، بحدٍّ أقصى ٤٠ كعبًا */
export function volumesOf(book: Pick<Book, 'volumes'>): number {
  return Math.min(40, Math.max(1, book.volumes ?? 1))
}

// ------------------------------------------------------------- عن المكتبة
/**
 * نصّ صفحة «عن المكتبة» بقلم صاحب المكتبة، منقولٌ حرفًا بحرف. وهو هنا لا في
 * القاعدة لأن الزرع الأوّل كتب في `about_text` نصًّا تجريبيًّا، فيبقى هذا هو
 * المعروض حتى يكتب صاحب المكتبة غيرَه من نافذة الإعدادات.
 *
 * وقسمتُه فقراتٍ مقصودة: يقرؤها العارض في `About.tsx` فيُفرد للبسملة وجهًا،
 * وللتوقيع وجهًا، ويُجري ما بينهما فقراتٍ.
 */
export const ABOUT_TEXT = `مكتبة سَيْف العشيرة.

بسم الله الرَّحْمَن الرحيم.

أَنِسْتُ بها، وأَلِفْتُها، وسكَنتُ إليها، ووجدتُّ فيها لَذَّتي، آتيها في كلّ مرَّة، وآخُذ أيَّ مُجلَّدٍ تصادِفُه كفِّي من أيِّ الأَرْفُف دُون تعمُّدِ واحدٍ منها بعينه، ثم أجلِس على المَكتَب، وأتنَحْنَحُ مُهيِّئًا حَنجَرتي لصَوتٍ مُرتفِع، ثم أضع الكتابُ وأَفُرُّ صفَحاتِه بإصبَعي حتى تستقرّ على صفحةٍ ما، ثم أفتَح تلك الصفحة وأقرأ أول جُملَةٍ تقعُ عليها عيني، قراءةً جهريةً مُرتفِعة الصوت، حتى إذا قرأتُ صفحتَين أو صفحةً ونصْف شدَّني كلامُ المُصنِّف، فصمتُّ عن الجَهْر، وأخذتُ أقرأُ سِرًّا مُتأمِّلًا مبتسمًا، حتى أُعْيِيَ ويَطُولَ مُكْثِي، فأُطْبِقُ دفَّتَيِ الكتاب، وأُعِيده إلى حيثُ أخذتُه، وأنصِرفُ. فإذا أتيتُها المرةَ المُقبِلة فعلتُ ما فعلتُه في الماضِيَة، كلَّ مرَّة أكون أكثرَ لَهَفًا، وأشدَّ اشتياقًا، وأَتْوَقَ نفسًا إلى ساعة دُخولي..

مكتبة الوالد أعزَّه الله، ورفع مَنار فَضْله، منذ عرفتُ الدنيا، وهي مكتبةٌ زاخرة العُرُوق، مُلْتاقة الطَّلْعة، وقد زِدتُّ فيها كثيرًا ووسَّعتُها وأضفتُ إليها. وإنما نسبتُ المكتبة إلى اسميَ المُستعار، لأجل قول الشاعر: «حقيقٌ بحادي العِيْس طُوْل التَّلثُّمِ» :) وإلا فالمكتبة للوالد -شرَّفه الله- على التحقيق، وليس لي فضلٌ مِن بعدِه، إلا كقطرةٍ من فيَّاضِ مَعِين عِدِّه، كيف وإنما أنا إليه أُنسَب، ومِن كَسْبه أُعَدّ وأُحْسَب؟

وإلى الله -سبحانه- الرغبة، ومن عنده تحقيق المأمَل والطِلْبَة، أن يُعلِّقنا بِشَرَف العِلْم، ويَسلُك بنا سبيلَه، ويُجنِّبنا بُنَيَّات الطريق، وأن يَحشُرنا يوم القِيامة في زُمرة أماجِد العُلماء الأَخْيار الأَتْقياء، والسلَف الصالح، والصحابة المَرْضيِّين الكِرام، وأن يرزُقَنا مجالسة النبيّ صلى الله عليه وسلَّم، ورؤية وجهه الكريم، إنه سميعٌ عليم.

وصلى الله على نبيِّنا مُحمَّد.

سَيْف العشيرة، ضُحَى السبت، ثانيَ ربيع الأول، عام ثمانية وأربعين وأربع مئة والف، من هجرة المصطفى صلَّى الله عليه وسلَّم.
2 (السَّبْت) / 3 (ربيع الأول) / 1448 هـ.`

/** ما زرعه `seed:run` في `about_text` أوّلَ مرة. يُعدّ فراغًا لا نصًّا. */
const SEEDED_ABOUT = 'هذا نصٌّ تجريبيٌّ إلى أن يُكتب مكانَه ما يليق'

/** نصّ «عن المكتبة»: ما كتبه صاحب المكتبة، وإلّا فالنصّ المعتمَد */
export function aboutTextOf(saved: string | null | undefined): string {
  const text = (saved ?? '').trim()
  return !text || text.includes(SEEDED_ABOUT) ? ABOUT_TEXT : text
}
