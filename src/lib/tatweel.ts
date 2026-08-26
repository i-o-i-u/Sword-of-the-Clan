// مَدُّ الشطر بالتطويل (ـ) حتى يملأ سطرَه.
//
// هذه هي خوارزميّة مدوّنة «سيف العشيرة» (`static/site.js`) منقولةً كما هي،
// وقواعدُها قواعدُ الخطّ العربيّ لا قواعدَ برمجة:
//
//   • لا يُوصَل بعد حرفٍ لا يتّصل بما بعده: (ا أ إ آ ٱ و ؤ ز ذ د ر ى ة ء ئ).
//   • ولا يُوصَل قبل همزةٍ مفردة، ولا بين لامِ التعريف وألفها.
//   • ولفظُ الجلالة وما اتّصل به (الله، اللهمّ، والله…) **لا يُمدّ أبدًا**.
//   • والتشكيلُ يلزم حرفَه: يُفصل عنه عند العدّ ثم يُردّ إليه، فلا تقع
//     الفتحةُ على وصلةٍ مستجدّة.
//
// والوصلاتُ تُوزَّع على مواضع الشطر كلِّها بالسويّة — بـ«أكبرِ باقٍ» بين
// الكلمات، ثم دورًا بين مواضع الكلمة الواحدة — فلا تتكدّس في كلمةٍ ويبقى
// ما سواها مضغوطًا.

const TASHKEEL = /[ً-ٰٟ]/
const NO_CONNECT_AFTER = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ', 'و', 'ؤ', 'ز', 'ذ', 'د', 'ر', 'ى', 'ة', 'ء', 'ئ'])
const PUNCT = new Set(['،', '؛', '؟', '!', '.', ',', ':', '-', '–', '—', '«', '»', '"', '(', ')', '/'])
const FORBIDDEN_WORDS = new Set(['الله', 'اللهم', 'بالله', 'تالله', 'والله', 'فالله', 'لله'])

interface Token { base: string; marks: string }

function tokenize(word: string): Token[] {
  const tokens: Token[] = []
  for (const ch of word) {
    if (TASHKEEL.test(ch)) {
      if (tokens.length) tokens[tokens.length - 1].marks += ch
    } else {
      tokens.push({ base: ch, marks: '' })
    }
  }
  return tokens
}

function tokensToString(tokens: Token[]): string {
  return tokens.map((t) => t.base + t.marks).join('')
}

function canConnectAfter(base: string): boolean {
  return !NO_CONNECT_AFTER.has(base) && !PUNCT.has(base) && /[؀-ۿ]/.test(base)
}

/** مواضعُ الوصل الصالحة في الكلمة، من مطلعها فتتوزّع الزيادةُ بالتساوي */
function insertPositions(tokens: Token[]): number[] {
  const positions: number[] = []
  let lastValid = tokens.length - 1
  while (lastValid > 0 && PUNCT.has(tokens[lastValid].base)) lastValid--
  for (let i = lastValid - 1; i >= 1; i--) {
    const nextBase = tokens[i + 1]?.base
    if (nextBase && PUNCT.has(nextBase)) continue
    // لا يُفصل بين لامِ التعريف وألفها
    if (tokens[i].base === 'ل' && nextBase && 'اأإآٱ'.includes(nextBase)) continue
    if (nextBase === 'ء') continue
    if (canConnectAfter(tokens[i].base)) positions.push(i + 1)
  }
  return positions.sort((a, b) => a - b)
}

function buildWord(tokens: Token[], slots: Map<number, number>): string {
  const out: Token[] = []
  for (let i = 0; i < tokens.length; i++) {
    out.push(tokens[i])
    const count = slots.get(i + 1) ?? 0
    for (let k = 0; k < count; k++) out.push({ base: 'ـ', marks: '' })
  }
  return tokensToString(out)
}

/** توزيعٌ دوريّ على المواضع، فلا تتكدّس الوصلاتُ في موضعٍ واحد */
function spread(positions: number[], n: number): Map<number, number> {
  const slots = new Map<number, number>()
  if (!positions.length || n <= 0) return slots
  for (let k = 0; k < n; k++) {
    const pos = positions[k % positions.length]
    slots.set(pos, (slots.get(pos) ?? 0) + 1)
  }
  return slots
}

let canvas: HTMLCanvasElement | null = null
function measurer(font: string): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  canvas = canvas ?? document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = font
  return ctx
}

/**
 * الشطرُ ممدودًا إلى عرضٍ بعينه. يُعيد النصَّ كما هو إن لم يكن فيه فضلٌ
 * يُملأ، أو لم يكن فيه موضعُ وصلٍ صالح.
 *
 * `available` عرضُ الخليّة بالبكسل، و`font` وصفُ خطِّها كما يقرؤه القماش.
 */
export function stretchShatr(text: string, available: number, font: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length || available <= 10) return text

  const ctx = measurer(font)
  if (!ctx) return text

  const data = words.map((w) => {
    const bare = w.replace(/[ً-ٰٟ]/g, '')
    const forbidden = [...FORBIDDEN_WORDS].some((fw) => bare.includes(fw))
    const tokens = tokenize(w)
    return {
      tokens,
      positions: forbidden ? [] : insertPositions(tokens),
      width: ctx.measureText(tokensToString(tokens)).width,
    }
  })

  const tatweelWidth = ctx.measureText('ـ').width
  const spaceWidth = ctx.measureText(' ').width
  const baseTotal = data.reduce((sum, w) => sum + w.width, 0)
    + spaceWidth * Math.max(0, data.length - 1)

  // هامشُ أمانٍ ٢٪: قياسُ القماش يفارق قياسَ الرسم قليلًا، وفيضُ الشطر
  // على سطره أقبحُ من نقصه عنه
  const gap = (available - baseTotal) * 0.98
  if (gap <= 0.5) return words.join(' ')

  const totalSlots = data.reduce((sum, w) => sum + w.positions.length, 0)
  if (totalSlots === 0) return words.join(' ')

  const total = Math.floor(gap / tatweelWidth)
  if (total <= 0) return words.join(' ')

  // «أكبرُ باقٍ» ليكون مجموعُ الموزَّع مساويًا للمطلوب تمامًا
  const shares = data.map((w) => (total * w.positions.length) / totalSlots)
  const floors = shares.map((v) => Math.floor(v))
  const left = total - floors.reduce((a, b) => a + b, 0)
  const order = shares
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < left; k++) floors[order[k].i]++

  return data
    .map((w, i) => (w.positions.length ? buildWord(w.tokens, spread(w.positions, floors[i])) : tokensToString(w.tokens)))
    .join(' ')
}

/** وصفُ خطّ العنصر كما يقرؤه القماش */
export function fontOf(el: Element): string {
  const cs = getComputedStyle(el)
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`
}

/** يُجرَّد النصُّ من الوصلات عند النسخ: تلك زينةُ العرض لا من الشعر */
export function stripTatweel(text: string): string {
  return text.replace(/ـ+/g, '')
}
