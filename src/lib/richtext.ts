// نصُّ الفائدة المنسَّق: تشذيبُه، وتجريدُه، ورموزُه، وهوامشُه.
//
// نصُّ الفائدة يُكتب في مُحرِّرٍ حرِّ التنسيق (`RichEditor`) فيُحفظ HTML في
// `text_html`، **ويُحفظ معه نصُّه مجرَّدًا في `text`**. والتجريدُ ليس تكرارًا:
// عليه يقوم البحثُ والعزوُ ومختصرُ البطاقة والفهرس، فلو قامت على HTML لبحث
// القارئُ عن كلمةٍ فوجدها في اسم صنفٍ لا في كلام المؤلِّف. والحقلان يُكتبان
// معًا في كل حفظ، فلا يفترقان.
//
// وما يُقرأ من القاعدة **يُشذَّب قبل أن يُرسم** لا عند حفظه وحده: الحفظُ
// يمرّ من الواجهة، والقراءةُ تمرّ على كل زائر. فالتشذيبُ عند الرسم هو
// الحارس، وعند الحفظ زيادةُ احتياط.

/** الوسومُ المسموح بها في نصّ الفائدة. وما سواها يُفكّ ويبقى نصُّه. */
const TAGS = new Set([
  'P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'SUP', 'SUB',
  'SPAN', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'TBODY', 'TR', 'TD',
])

/** وما يُحذف بجوفه: نصُّه ليس نصَّ الفائدة */
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'])

/**
 * وسومٌ معناها معنى وسمٍ مأذونٍ فيه، فتُردّ إليه ولا تُفكّ. **وأوّلُها `STRIKE`**:
 * زرُّ «مشطوب» في المُحرِّر يُخرجه كروم وفيرفكس بهذا الوسم القديم لا بـ`S`،
 * فكان التشذيبُ يفكّه عند الحفظ فيُحفظ النصُّ بلا شطب.
 */
const ALIAS: Record<string, string> = { STRIKE: 's', DEL: 's', INS: 'u' }

/**
 * يقرأ HTML في جسد وثيقةٍ مستقلّة. **والجسدُ نفسُه هو الوعاء** لا عنصرٌ يُلفّ
 * فيه النصّ: كان يُلفّ في `<div id="r">`، فإن كان في المحفوظ وسمُ إغلاقٍ زائد
 * أغلق ذلك الوعاءَ قبل أوانه فسقط ما بعده كلُّه بلا خبر. ووسمُ الإغلاق الزائد
 * في الجسد يُهمَل.
 */
function parseBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html').body
}

/** أصنافُ الشعر والهوامش والتظليل. وما سواها يسقط، فلا يُحمَّل النصُّ أنماطًا */
const CLASSES = new Set([
  'poem-wrap', 'poem-wrap-rajaz', 'poetry-table', 'rajaz-table',
  'shatr', 'shatr-first', 'shatr-last', 'rajaz-shatr', 'bayt-no',
  'fn', 'hi',
])

/**
 * يشذّب HTML الوارد: يُسقط ما ليس من الوسوم المأذون فيها ويُبقي نصَّه،
 * ويمحو الصفاتِ كلَّها إلا `class` من قائمةٍ معلومة و`data-fn` للهامش
 * و`data-original` لأصل الشطر قبل مدّه.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const root = parseBody(html)

  const walk = (node: Element) => {
    for (const original of [...node.children]) {
      if (DROP.has(original.tagName)) { original.remove(); continue }
      let child = original
      const alias = ALIAS[child.tagName]
      if (alias) {
        const el = child.ownerDocument.createElement(alias)
        el.append(...child.childNodes)
        child.replaceWith(el)
        child = el
      }
      walk(child)
      if (!TAGS.has(child.tagName)) {
        // الوسمُ غيرُ مأذونٍ فيه: يُفكّ ويبقى ما في جوفه
        child.replaceWith(...child.childNodes)
        continue
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase()
        if (name === 'class') {
          const kept = attr.value.split(/\s+/).filter((c) => CLASSES.has(c))
          if (kept.length) child.setAttribute('class', kept.join(' '))
          else child.removeAttribute('class')
        } else if (name === 'data-fn' || name === 'data-original') {
          // يبقيان: الأول مِسماكُ الهامش، والثاني أصلُ الشطر قبل مدّه
        } else {
          child.removeAttribute(attr.name)
        }
      }
    }
  }
  walk(root)
  return root.innerHTML
}

/** أفي النصّ المنسَّق شيءٌ يُعرض؟ الوسمُ الفارغ ليس نصًّا */
export function htmlIsEmpty(html: string): boolean {
  return !htmlToText(html).trim()
}

/**
 * يجرّد HTML إلى نصٍّ مسترسل. والشعرُ يعود إلى صورته النصّية — `صدرٌ * عَجُز`
 * و`* شطر` — كما تُكتب في `lib/poetry.ts`: فما نُسخ من بطاقةٍ أو بُحث فيه
 * يبقى شعرًا يُعرف.
 */
export function htmlToText(html: string): string {
  if (!html) return ''
  const root = parseBody(html)
  root.querySelectorAll('.bayt-no').forEach((el) => el.remove())

  let out = ''
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { out += node.nodeValue ?? ''; return }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.tagName

    if (tag === 'BR') { out += '\n'; return }
    if (tag === 'TD') {
      const text = (el.getAttribute('data-original') ?? el.textContent ?? '').trim()
      if (el.classList.contains('rajaz-shatr')) { out += `* ${text}\n`; return }
      if (el.classList.contains('shatr-first')) { out += `${text} * `; return }
      if (el.classList.contains('shatr-last')) { out += `${text}\n`; return }
      out += text
      return
    }

    for (const child of [...el.childNodes]) visit(child)

    if (['P', 'DIV', 'LI', 'TR', 'BLOCKQUOTE', 'TABLE', 'UL', 'OL'].includes(tag)) {
      if (!out.endsWith('\n')) out += '\n'
    }
  }
  for (const child of [...root.childNodes]) visit(child)

  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * النصُّ العاديّ يُحوَّل إلى فقرات. تُستعمل حين تُفتح فائدةٌ قُيِّدت قبل
 * المُحرِّر المنسَّق: نصُّها محفوظٌ في `text` وحده، فيُرفع إلى المُحرِّر فقراتٍ
 * ولا يُطالَب صاحبُها بإعادة كتابته.
 */
export function textToHtml(text: string): string {
  if (!text.trim()) return ''
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('')
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// الهوامش
// ---------------------------------------------------------------------------

/** هامشٌ مُرقَّم: مِسماكُه في النصّ، ونصُّه تحته */
export interface Footnote { id: string; text: string }

/** مِسماكاتُ الهوامش كما وقعت في النصّ، على ترتيبها فيه */
export function footnoteIds(html: string): string[] {
  // يُنادى مع كل حرفٍ في المُحرِّر، فلا يُقرأ النصُّ شجرةً إن لم يكن فيه هامش
  if (!html || !html.includes('data-fn')) return []
  return [...parseBody(html).querySelectorAll('sup[data-fn]')]
    .map((el) => el.getAttribute('data-fn') ?? '')
    .filter(Boolean)
}

/**
 * الهوامشُ مرتَّبةً بترتيب مِسماكاتها من النصّ، ويسقط منها ما مُحي مِسماكُه.
 * فالترقيمُ في العرض عدٌّ تلقائيّ (`counter`) لا رقمٌ محفوظ: يُقحَم هامشٌ في
 * الوسط فيُعاد ترقيمُ ما بعده من نفسه.
 */
export function orderedFootnotes(html: string, notes: Footnote[]): Footnote[] {
  const byId = new Map(notes.map((n) => [n.id, n]))
  return footnoteIds(html).map((id) => byId.get(id) ?? { id, text: '' })
}

/** مِسماكٌ جديد. لا يُقرأ ولا يُعرض، وإنما يربط الهامشَ بموضعه */
export function newFootnoteId(): string {
  return 'f' + Math.random().toString(36).slice(2, 9)
}

// ---------------------------------------------------------------------------
// الرموز
// ---------------------------------------------------------------------------

/** رمزٌ يُدرَج في النصّ بضغطة: ما يُكتب، وما يُقال عنه في التلميح */
export interface SymbolDef { text: string; label: string; wide?: boolean }

/**
 * الرموزُ التي تُدرَج في نصّ الفائدة.
 *
 * وما له رمزٌ في يونيكود يُدرَج رمزًا — الصلاةُ والترضِّي عن الواحد والرحمةُ
 * — فيبقى حرفًا واحدًا يُنسخ ويُبحث فيه. وما لا رمزَ له — «رضي الله عنهما»
 * وأخواتُها — يُدرَج بلفظه تامًّا: صورةٌ مركَّبة تُرسم في بعض الخطوط ولا
 * تُرسم في بعض، والنصُّ المكتوب يُقرأ في كلِّها.
 */
export const SYMBOL_GROUPS: { label: string; items: SymbolDef[] }[] = [
  {
    label: 'الصلاة والتعظيم',
    items: [
      { text: 'ﷺ', label: 'صلّى الله عليه وسلّم' },
      { text: 'ﷻ', label: 'جلّ جلاله' },
      { text: 'ؐ', label: 'صلّى الله عليه وآله وسلّم (علامة)' },
      { text: '﷽', label: 'بسم الله الرحمن الرحيم', wide: true },
      { text: '۝', label: 'علامةُ نهاية الآية' },
    ],
  },
  {
    label: 'الترضِّي والترحُّم',
    items: [
      { text: 'ؓ', label: 'رضي الله عنه (علامة)' },
      { text: 'رضي الله عنها', label: 'رضي الله عنها' },
      { text: 'رضي الله عنهما', label: 'رضي الله عنهما' },
      { text: 'رضي الله عنهم', label: 'رضي الله عنهم' },
      { text: 'رضي الله عنهنّ', label: 'رضي الله عنهنّ' },
      { text: 'ؑ', label: 'عليه السلام (علامة)' },
      { text: 'عليهما السلام', label: 'عليهما السلام' },
      { text: 'عليهم السلام', label: 'عليهم السلام' },
      { text: 'ؒ', label: 'رحمه الله (علامة)' },
    ],
  },
  {
    label: 'حروفٌ صغيرة وعلامات',
    items: [
      { text: 'ۥ', label: 'واوٌ صغيرة' },
      { text: 'ۦ', label: 'ياءٌ صغيرة' },
      { text: 'ٰ', label: 'ألفٌ خنجريّة' },
      { text: 'ـ', label: 'تطويل' },
      { text: 'ۖ', label: 'علامةُ وقفٍ (صلى)' },
      { text: 'ۗ', label: 'علامةُ وقفٍ (قلى)' },
      { text: '۞', label: 'علامةُ الحزب' },
      { text: '۩', label: 'علامةُ السجدة' },
    ],
  },
  {
    label: 'أقواسٌ وفواصل',
    items: [
      { text: '﴿', label: 'قوسُ آيةٍ فاتح' },
      { text: '﴾', label: 'قوسُ آيةٍ خاتم' },
      { text: '«', label: 'قوسُ اقتباسٍ فاتح' },
      { text: '»', label: 'قوسُ اقتباسٍ خاتم' },
      { text: '؛', label: 'فاصلةٌ منقوطة' },
      { text: '،', label: 'فاصلة' },
      { text: '؟', label: 'علامةُ استفهام' },
      { text: '٭', label: 'نجمة' },
    ],
  },
]

// ---------------------------------------------------------------------------
// صفُّ الشعر
// ---------------------------------------------------------------------------
//
// البيتُ `صدرٌ * عَجُز`، وشطرُ الرجز `*الشطر*` (أو `* الشطر` كما يُجرَّد).
// وكان الصفُّ في المُحرِّر وحده، ولا ينظر إلا في **كُتل اللوح العليا** — فقرةً
// فقرة — فيفوته ثلاثة:
//   ١. البيتُ في فقرةٍ واحدةٍ مع ما قبله، مفصولًا بسطرٍ لا بفقرة: «قال الشاعر:»
//      ثم Shift+Enter ثم البيت، أو نصٌّ لُصق فصار فقرةً أسطرُها `<br>`.
//   ٢. السطرُ الأوّل يُكتب في اللوح الفارغ نصًّا عاريًا لا فقرةَ حوله.
//   ٣. السطرُ الأخير إذا حُفظ بـCtrl+Enter والمؤشِّرُ فيه: لا يُترك فلا يُصفّ.
// فخرجت أبياتٌ منثورةً في فوائدَ محفوظة. فصار الصفُّ هنا دالّةً واحدة: تفصل
// الأسطرَ أوّلًا ثم تصفّ، **ويستعملها العرضُ كما يستعملها المُحرِّر** — فما
// حُفظ قبل الإصلاح يُعرض مصفوفًا بلا إعادة تحرير.

/** بيتٌ: صدرٌ ونجمةٌ محفوفةٌ بفراغين وعَجُز. ولا يبدأ بنجمة، فذاك رجز. */
const POEM_VERSE = /^(?!\s*\*)(.+?)\s\*\s(.+)$/
/** شطرُ الرجز: نجمةٌ في أوّله، وقد تُختم بأخرى. ولا نجمةَ في جوفه. */
const POEM_RAJAZ = /^\*\s*([^*]+?)\s*\*?$/

type PoemKind = 'verse' | 'rajaz'

function poemLine(line: string): { kind: PoemKind; parts: string[] } | null {
  const t = line.trim()
  if (!t) return null
  const rajaz = POEM_RAJAZ.exec(t)
  if (rajaz && rajaz[1].trim()) return { kind: 'rajaz', parts: [rajaz[1].trim()] }
  const verse = POEM_VERSE.exec(t)
  if (verse && verse[1].trim() && verse[2].trim()) {
    return { kind: 'verse', parts: [verse[1].trim(), verse[2].trim()] }
  }
  return null
}

const poemTableClass = (kind: PoemKind) => (kind === 'rajaz' ? 'rajaz-table' : 'poetry-table')

function poemRow(doc: Document, kind: PoemKind, parts: string[]): HTMLTableRowElement {
  const row = doc.createElement('tr')
  const classes = kind === 'rajaz' ? ['rajaz-shatr'] : ['shatr shatr-first', 'shatr shatr-last']
  parts.forEach((text, i) => {
    const td = doc.createElement('td')
    td.className = classes[i]
    // أصلُ الشطر قبل مدّه بالتطويل: عليه يُقاس المدُّ في كل مرّة
    td.setAttribute('data-original', text)
    td.textContent = text
    row.appendChild(td)
  })
  const no = doc.createElement('td')
  no.className = 'bayt-no'
  row.appendChild(no)
  return row
}

function poemWrapOf(doc: Document, kind: PoemKind, row: HTMLTableRowElement): HTMLElement {
  const wrap = doc.createElement('div')
  wrap.className = kind === 'rajaz' ? 'poem-wrap poem-wrap-rajaz' : 'poem-wrap'
  const table = doc.createElement('table')
  table.className = poemTableClass(kind)
  const body = doc.createElement('tbody')
  body.appendChild(row)
  table.appendChild(body)
  wrap.appendChild(table)
  return wrap
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE'])
const isBlock = (n: Node) => n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName)

/**
 * يقسم فقرةً أسطرُها `<br>` فقراتٍ — **إن كان في أسطرها شعر**، وإلّا تُركت كما
 * هي: النثرُ المكسور بأسطرٍ مقصودٌ كسرُه، ولا شأنَ للصفّ به.
 */
function splitLines(block: HTMLElement) {
  if (!block.querySelector('br')) return
  const doc = block.ownerDocument
  const lines: Node[][] = [[]]
  for (const child of [...block.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === 'BR') lines.push([])
    else lines[lines.length - 1].push(child)
  }
  const textOf = (nodes: Node[]) => nodes.map((n) => n.textContent ?? '').join('')
  if (!lines.some((l) => poemLine(textOf(l)))) return

  const tag = block.tagName === 'DIV' ? 'div' : 'p'
  const parts = lines
    .filter((l, i) => i < lines.length - 1 || textOf(l).trim() || l.length)
    .map((nodes) => {
      const p = doc.createElement(tag)
      if (nodes.length) nodes.forEach((n) => p.appendChild(n))
      else p.appendChild(doc.createElement('br'))
      return p
    })
  block.replaceWith(...parts)
}

/**
 * يصفّ الشعرَ في شجرةٍ من نصّ الفائدة، ويُخبر أوقع فيها تغيير.
 *
 * `skip` كتلةُ المؤشِّر في المُحرِّر: لا تُمسّ، وإلّا قفز من تحت اليد — تُصفّ
 * متى تُركت. وفي العرض لا مؤشِّر، فيُصفّ كلُّ شيء.
 */
export function layoutPoems(root: HTMLElement, skip: Node | null = null): boolean {
  const doc = root.ownerDocument
  let changed = false

  // ٠. السطرُ المفصولُ بحرف السطر لا بوسم: نصٌّ لُصق في بعض المتصفّحات (فيرفكس)
  //    فحُفظ كما هو، أسطرُه حرفُ السطر في عقدةٍ واحدة — وبه خرج البيتُ منثورًا في
  //    فائدة «أصل العِزبة» وهو مكتوبٌ على علامته. فيُردّ كلُّ حرف سطرٍ وسمَ سطر.
  //    وما كان فراغًا محضًا بين وسمين فتنسيقٌ للشيفرة لا سطرٌ في النصّ، فيُترك.
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const broken: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text
    if (t.data.includes('\n') && t.data.trim() && !t.parentElement?.closest('td, pre')) broken.push(t)
  }
  for (const t of broken) {
    if (skip && (t === skip || t.contains(skip))) continue
    const parts = t.data.split('\n')
    const nodes: Node[] = []
    parts.forEach((part, i) => {
      if (i > 0) nodes.push(doc.createElement('br'))
      if (part) nodes.push(doc.createTextNode(part))
    })
    t.replaceWith(...nodes)
    changed = true
  }

  // ١. ما كان في اللوح عاريًا — نصًّا أو تنسيقًا بلا فقرة — يُضمّ في فقرة
  let loose: Node[] = []
  const wrapLoose = (before: Node | null) => {
    // وما فيه المؤشِّرُ يُترك: نقلُ عقدته يُسقط الاختيارَ في بعض المتصفّحات
    const holdsCaret = skip !== null && loose.some((n) => n === skip || n.contains(skip))
    if (!holdsCaret && loose.some((n) => (n.textContent ?? '').trim())) {
      const p = doc.createElement('p')
      root.insertBefore(p, before)
      loose.forEach((n) => p.appendChild(n))
      changed = true
    }
    loose = []
  }
  for (const child of [...root.childNodes]) {
    if (isBlock(child)) wrapLoose(child)
    else loose.push(child)
  }
  wrapLoose(null)

  // ٢. الفقرةُ ذاتُ الأسطر تُقسم أسطرًا، إن كان فيها شعر
  for (const block of [...root.children] as HTMLElement[]) {
    if (block.classList.contains('poem-wrap')) continue
    if (skip && block.contains(skip)) continue
    if (block.tagName === 'P' || block.tagName === 'DIV') {
      const before = root.children.length
      splitLines(block)
      if (root.children.length !== before) changed = true
    }
  }

  /**
   * لوحُ الشعر الذي قبل الكتلة من جنسها، **وإن فصل بينهما سطرٌ فارغ**: من كتب
   * بيتًا ثم نزل سطرين ثم كتب الثاني — أو لصق قصيدةً بين أبياتها أسطرٌ فارغة،
   * وهو الأكثر — كان كلُّ بيتٍ يقوم في لوحٍ وحده، فلا يُرقَّم شيءٌ منها: البيتُ
   * الواحد لا يُرقَّم. والفاصلُ الفارغ يُرفع حين يُضمّ ما بعده، إلّا أن يكون
   * فيه المؤشِّر — رفعُه يُسقط المؤشِّرَ من تحت اليد — فيبقى حدًّا بين لوحين.
   */
  const poemBefore = (block: Element, kind: PoemKind) => {
    const gaps: Element[] = []
    let prev = block.previousElementSibling
    while (prev && isBlank(prev)) {
      if (skip && prev.contains(skip)) return null
      gaps.push(prev)
      prev = prev.previousElementSibling
    }
    const table = prev?.classList.contains('poem-wrap')
      ? prev.querySelector<HTMLTableElement>(`table.${poemTableClass(kind)}`)
      : null
    return table ? { table, gaps } : null
  }

  // ٣. كلُّ سطرٍ هو بيتٌ أو شطرٌ يُصفّ، ويُضمّ إلى لوحٍ من جنسه قبله
  for (const block of [...root.children] as HTMLElement[]) {
    if (block.tagName !== 'P' && block.tagName !== 'DIV') continue
    if (block.classList.contains('poem-wrap')) continue
    if (skip && block.contains(skip)) continue
    const hit = poemLine(block.textContent ?? '')
    if (!hit) continue

    const row = poemRow(doc, hit.kind, hit.parts)
    const before = poemBefore(block, hit.kind)
    if (before) {
      (before.table.tBodies[0] ?? before.table).appendChild(row)
      before.gaps.forEach((g) => g.remove())
      block.remove()
    } else {
      block.replaceWith(poemWrapOf(doc, hit.kind, row))
    }
    changed = true
  }

  // ٤. واللوحان المتواليان من جنسٍ واحد يُضمّان: ما حُفظ قبل هذا الإصلاح
  //    محفوظٌ لوحًا لكلّ بيت، فيُضمّ عند العرض بلا إعادة تحرير
  for (const wrap of [...root.children] as HTMLElement[]) {
    if (!wrap.classList.contains('poem-wrap') || !wrap.isConnected) continue
    const own = wrap.querySelector<HTMLTableElement>('table.poetry-table, table.rajaz-table')
    if (!own) continue
    const kind: PoemKind = own.classList.contains('rajaz-table') ? 'rajaz' : 'verse'
    const before = poemBefore(wrap, kind)
    if (!before) continue
    const body = before.table.tBodies[0] ?? before.table
    for (const tr of [...own.querySelectorAll('tr')]) body.appendChild(tr)
    before.gaps.forEach((g) => g.remove())
    wrap.remove()
    changed = true
  }

  // ٥. والبيتُ الذي مُحي نصُّه يُرفع، واللوحُ الذي لم يبقَ فيه بيت
  if (dropEmptyPoems(root, skip)) changed = true
  return changed
}

/**
 * يرفع من الشعر ما لا نصَّ فيه: البيتَ الذي مُحي صدرُه وعَجُزُه، ثم اللوحَ الذي
 * لم يبقَ فيه بيت.
 *
 * وكان يبقى: من حدّد أبياتًا ومحاها بقي جدولُها بخلايا فارغة، لا يُرى منه إلا
 * الخيطُ الذي بين الشطرين، **ولا يُكتب فيه ولا يُحذف** — فيرفوكس لا يضع المؤشِّرَ
 * في خليّةٍ فارغةٍ تمامًا. **والبيتُ الذي فيه المؤشِّرُ يُترك**: صاحبُه محا نصَّه
 * ليكتب غيرَه، فلا يُسحب من تحت يده.
 */
export function dropEmptyPoems(root: HTMLElement, skip: Node | null = null): boolean {
  let changed = false
  for (const row of [...root.querySelectorAll('.poem-wrap tr')]) {
    if (skip && row.contains(skip)) continue
    const cells = [...row.querySelectorAll('td')].filter((td) => !td.classList.contains('bayt-no'))
    if (cells.some((td) => (td.textContent ?? '').replace(/\u0640/g, '').trim())) continue
    row.remove()
    changed = true
  }
  for (const wrap of [...root.querySelectorAll('.poem-wrap')]) {
    if (wrap.querySelector('tr')) continue
    if (skip && wrap.contains(skip)) continue
    wrap.remove()
    changed = true
  }
  return changed
}

/** كتلةٌ لا شيءَ فيها يُقرأ: فقرةٌ فارغة، أو سطرٌ فيه `<br>` وحده */
function isBlank(el: Element): boolean {
  return (el.tagName === 'P' || el.tagName === 'DIV')
    && !el.classList.contains('poem-wrap')
    && !(el.textContent ?? '').trim()
    && !el.querySelector('sup, img, table')
}

/** صفُّ الشعر في نصٍّ محفوظ: يُستعمل عند الحفظ وعند العرض */
export function layoutPoemsHtml(html: string): string {
  // والمحفوظُ مصفوفًا لا نجمةَ فيه، وقد تكون أبياتُه ألواحًا متفرّقةً تُضمّ
  if (!html || (!html.includes('*') && !html.includes('poem-wrap'))) return html
  const root = parseBody(html)
  return layoutPoems(root) ? root.innerHTML : html
}
