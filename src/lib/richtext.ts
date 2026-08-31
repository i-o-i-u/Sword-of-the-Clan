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
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html')
  const root = doc.getElementById('r')
  if (!root) return ''

  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (DROP.has(child.tagName)) { child.remove(); continue }
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
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html')
  const root = doc.getElementById('r')
  if (!root) return ''
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
  if (!html) return []
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html')
  return [...(doc.getElementById('r')?.querySelectorAll('sup[data-fn]') ?? [])]
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
