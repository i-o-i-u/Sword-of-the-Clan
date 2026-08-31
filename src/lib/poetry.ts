// الشعرُ في النصّ المجرَّد.
//
// وهو النصُّ الذي لا تنسيقَ معه: تعليقُ المُقيِّد، وما قُيِّد قبل المُحرِّر
// المنسَّق. يُحفظ كما هو، فلا يُبنى له مُحرِّرٌ ذو عُقَد ولا
// تُخزَّن أبياتُه في جدولٍ على حِدَة. وإنما تُعلَّم أسطرُ الشعر بعلامةٍ
// واحدة — **النجمة** — هي نفسُها التي يُفصل بها بين الشطرين في الكتابة
// المعتادة:
//
//     صدرُ البيت * عَجُزه        ← بيتٌ من الشعر
//     * شطرُ الرجز               ← شطرٌ من الرجز
//
// وما توالى من جنسٍ واحد جُمع في جدولٍ واحد، فتُصفّ أبياتُ القصيدة صفًّا.
// وما سواهما نثرٌ يُعرض كما هو.
//
// والعلامةُ اختيرت لأنها لا تقع في النثر العربيّ أصلًا محفوفةً بفراغين، ولأن
// كاتبَ الفائدة يعرفها من قبل: هي التي يُنسَخ بها الشعرُ في المنتديات والكتب
// المرقونة. وهي نفسُها علامةُ الشعر في المُحرِّر المنسَّق، فلا يُطالَب الفاهرسُ
// بعلامتين.

export type PoemKind = 'verse' | 'rajaz'

/** بيتٌ: صدرٌ وعَجُز. وفي الرجز يبقى `second` فارغًا. */
export interface PoemLine { first: string; second: string }

export type Block =
  | { kind: 'prose'; text: string }
  | { kind: PoemKind; lines: PoemLine[] }

/** علامةُ الشعر: نجمةٌ محفوفةٌ بفراغين تفصل الصدرَ عن العَجُز */
const VERSE_SPLIT = /\s\*\s/

/** وشطرُ الرجز نجمةٌ في مطلعه لا شطرَ بعدها */
const RAJAZ_HEAD = /^\*\s+/

function classify(line: string): { kind: PoemKind; line: PoemLine } | null {
  const t = line.trim()
  if (!t) return null

  if (RAJAZ_HEAD.test(t)) {
    const body = t.replace(RAJAZ_HEAD, '').trim()
    // ولا يكون في الشطر نجمةٌ ثانية، وإلّا فهو بيتٌ كُتبت نجمتُه في أوّله سهوًا
    if (body && !VERSE_SPLIT.test(body)) return { kind: 'rajaz', line: { first: body, second: '' } }
  }

  const parts = t.split(VERSE_SPLIT)
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return { kind: 'verse', line: { first: parts[0].trim(), second: parts[1].trim() } }
  }
  return null
}

/**
 * يقسم النصَّ كتلًا: نثرًا وشعرًا ورجزًا. وما توالى من الشعر جُمع في كتلةٍ
 * واحدة ليُصفّ في جدولٍ واحد، وكذلك الرجز.
 */
export function parsePoetry(text: string): Block[] {
  const blocks: Block[] = []
  let prose: string[] = []

  const flushProse = () => {
    // الأسطرُ الفارغةُ في طرفَي النثر لا تُعرض: هي فاصلُ ما قبلها عمّا بعدها
    const body = prose.join('\n').replace(/^\n+|\n+$/g, '')
    if (body) blocks.push({ kind: 'prose', text: body })
    prose = []
  }

  for (const raw of text.split('\n')) {
    const hit = classify(raw)
    if (!hit) { prose.push(raw); continue }

    flushProse()
    const last = blocks[blocks.length - 1]
    if (last && last.kind === hit.kind) last.lines.push(hit.line)
    else blocks.push({ kind: hit.kind, lines: [hit.line] })
  }
  flushProse()

  return blocks
}

/** أفي النصّ شعرٌ أصلًا؟ يُسأل قبل التقسيم فلا يُبنى جدولٌ لنثرٍ محض */
export function hasPoetry(text: string): boolean {
  return parsePoetry(text).some((b) => b.kind !== 'prose')
}

/** سطرُ البيت كما يُكتب في النصّ */
export function verseLine(first: string, second: string): string {
  return `${first.trim()} * ${second.trim()}`
}

/** وسطرُ الرجز */
export function rajazLine(shatr: string): string {
  return `* ${shatr.trim()}`
}
