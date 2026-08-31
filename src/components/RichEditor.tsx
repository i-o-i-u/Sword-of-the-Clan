// مُحرِّرُ نصّ الفائدة: تنسيقٌ حرٌّ كما في الوورد، وزيادةٌ عليه بثلاث:
// الشعرُ يُصفّ وأنت تكتب، والرموزُ تُدرَج بضغطة، والهوامشُ تُرقَّم من نفسها.
//
//   • **التنسيق**: عريضٌ ومائلٌ وتحته خطّ ومُظلَّلٌ وقوائمُ ونقلٌ مُزاح.
//     وهو لوحُ تحريرٍ في الصفحة (`contenteditable`) لا حقلَ نصٍّ مجرَّد،
//     ويُحفظ ما فيه HTML مشذَّبًا في `text_html` — ومعه نصُّه مجرَّدًا في
//     `text`، عليه يقوم البحثُ والعزو.
//
//   • **الشعر**: يُكتب البيتُ `صدرٌ * عَجُز` فإذا نزل السطرُ صُفَّ في جدوله،
//     ويُكتب شطرُ الرجز `*الشطر*` فيُصفّ في عموده. وما توالى من جنسٍ واحد
//     انضمّ إلى ما قبله في جدولٍ واحد ورُقِّم — والترقيمُ عدٌّ تلقائيّ في
//     ملف الأنماط لا رقمٌ يُكتب، فيُقحَم بيتٌ في الوسط فيُعاد الترقيمُ من
//     نفسه. والبيتُ الواحد لا يُرقَّم: عدٌّ لواحدٍ ليس عدًّا.
//
//   • **الهوامش**: نجمتان `**` في أيّ موضعٍ تصيران مِسماكَ هامشٍ مُرقَّم،
//     ونصُّه يُكتب في صفٍّ تحت اللوح. والرقمُ عدٌّ تلقائيّ كترقيم الأبيات،
//     فالهامشُ يُقحَم بين هامشين ولا يُعاد ترقيمُ شيء باليد.
//
// والتحويلُ لا يمسّ الكتلةَ التي فيها مؤشِّرُ الكتابة أبدًا: لو مُسّت لقفز
// المؤشِّرُ من تحت اليد. ولذلك يقع التصفيفُ بعد نزول السطر لا في أثنائه —
// السطرُ الذي تُرك هو الذي يُصفّ، والمؤشِّرُ في الذي بعده.

import { useEffect, useRef, useState } from 'react'
import {
  SYMBOL_GROUPS, newFootnoteId, type Footnote,
} from '../lib/richtext'
import {
  BoldIcon, ClearIcon, HighlightIcon, ItalicIcon, ListIcon, NoteIcon,
  NumberedListIcon, QuoteIcon, ScrollIcon, StrikeIcon, SymbolIcon, UnderlineIcon,
} from './ui'

interface Props {
  html: string
  onChange: (html: string) => void
  footnotes: Footnote[]
  onFootnotes: (next: Footnote[]) => void
  placeholder?: string
  /** لوحُ التعليق أقصرُ من لوح النصّ: التعقُّبُ سطرٌ أو سطران */
  small?: boolean
}

/** بيتٌ: صدرٌ ونجمةٌ وعَجُز. ولا يبدأ بنجمة، فذاك رجز. */
const VERSE = /^(?!\s*\*)(.+?)\s\*\s(.+)$/
/** وشطرُ الرجز محفوفٌ بنجمتين، كما يكتبه صاحبُ الكنّاش */
const RAJAZ = /^\*\s*([^*]+?)\s*\*$/

export default function RichEditor(
  { html, onChange, footnotes, onFootnotes, placeholder, small }: Props,
) {
  const ref = useRef<HTMLDivElement>(null)
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  const [empty, setEmpty] = useState(true)

  // اللوحُ غيرُ مُدارٍ من React: لو أُعيد رسمُ جوفه في كل حرفٍ لقفز
  // المؤشِّر. فيُملأ مرّةً عند التركيب، وما بعده يُقرأ منه ولا يُكتب فيه.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = html || '<p><br></p>'
    hardenMarks(el)
    setEmpty(!el.textContent?.trim())
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* لا يضرّ */ }
    // مرّةً واحدة عند فتح النموذج: الفائدةُ المُعدَّلة تُفتح بنموذجٍ جديد
    // (`key` في موضع النداء)، فلا حاجة إلى إعادة الملء عند كل تبدُّل
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** يُخبر الأعلى بما في اللوح الآن */
  function emit() {
    const el = ref.current
    if (!el) return
    setEmpty(!el.textContent?.trim())
    onChange(el.innerHTML)
  }

  /** ينفّذ أمرًا من أوامر التنسيق ثم يخبر الأعلى */
  function cmd(name: string, value?: string) {
    ref.current?.focus()
    document.execCommand(name, false, value)
    emit()
  }

  /** يُدرج نصًّا في موضع المؤشِّر: الرموزُ كلُّها تمرّ من هنا */
  function insertText(text: string) {
    ref.current?.focus()
    document.execCommand('insertText', false, text)
    emit()
  }

  /** التظليل: `mark` لا لونٌ في نمطٍ سطريّ — النمطُ السطريّ يسقط في التشذيب */
  function toggleHighlight() {
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    const range = sel.getRangeAt(0)

    // ما كان مُظلَّلًا يُرفع تظليلُه، وما سواه يُظلَّل
    const inMark = closestIn(range.startContainer, el, 'MARK')
    if (inMark) {
      inMark.replaceWith(...inMark.childNodes)
      emit()
      return
    }
    const mark = document.createElement('mark')
    try {
      range.surroundContents(mark)
    } catch {
      // الاختيارُ يقطع كتلًا، فلا يُحاط بعنصرٍ واحد
      mark.appendChild(range.extractContents())
      range.insertNode(mark)
    }
    sel.removeAllRanges()
    emit()
  }

  // ------------------------------------------------------------ الهوامش
  function addFootnote() {
    const el = ref.current
    if (!el) return
    el.focus()
    const id = newFootnoteId()
    insertNode(makeMarker(id))
    onFootnotes([...footnotes, { id, text: '' }])
    emit()
  }

  /**
   * النجمتان `**` تصيران مِسماكَ هامش. ويُقرأ ما قبل المؤشِّر لا النصُّ كلُّه:
   * الفحصُ يقع مع كل حرفٍ يُكتب، فلا يُمسح النصُّ كلُّه في كل ضغطة.
   */
  function maybeFootnoteFromStars() {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return false
    const at = range.startOffset
    if ((node.nodeValue ?? '').slice(Math.max(0, at - 2), at) !== '**') return false

    const cut = document.createRange()
    cut.setStart(node, at - 2)
    cut.setEnd(node, at)
    cut.deleteContents()

    const id = newFootnoteId()
    const marker = makeMarker(id)
    cut.insertNode(marker)
    placeCaretAfter(marker)
    onFootnotes([...footnotes, { id, text: '' }])
    return true
  }

  function dropFootnote(id: string) {
    const el = ref.current
    el?.querySelector(`sup[data-fn="${id}"]`)?.remove()
    onFootnotes(footnotes.filter((f) => f.id !== id))
    emit()
  }

  // ------------------------------------------------------------- الشعر
  /**
   * يصفّ ما تُرك من الأسطر شعرًا. ولا يمسّ الكتلةَ التي فيها المؤشِّر: تلك
   * تُصفّ متى تُركت هي أيضًا، فلا يقفز المؤشِّرُ من تحت اليد.
   */
  function layoutPoetry() {
    const el = ref.current
    if (!el) return
    const sel = window.getSelection()
    const anchor = sel?.anchorNode ?? null

    for (const block of [...el.children]) {
      if (block.classList.contains('poem-wrap')) continue
      if (anchor && block.contains(anchor)) continue
      // ما فيه تنسيقٌ داخليّ لا يُقلَب شعرًا: الشعرُ سطرٌ مجرَّد
      const line = (block.textContent ?? '').trim()
      if (!line) continue

      const rajaz = RAJAZ.exec(line)
      const verse = rajaz ? null : VERSE.exec(line)
      if (!rajaz && !verse) continue

      const kind = rajaz ? 'rajaz' : 'verse'
      const row = rajaz
        ? shatrRow([rajaz[1]], true)
        : shatrRow([verse![1].trim(), verse![2].trim()], false)

      // ما كان قبله لوحُ شعرٍ من جنسه ضُمّ إليه، فتُصفّ القصيدةُ في جدولٍ
      // واحد وتُرقَّم أبياتُها من أوّلها
      const before = block.previousElementSibling
      const table = before?.classList.contains('poem-wrap')
        ? before.querySelector<HTMLTableElement>(`table.${tableClass(kind)}`)
        : null

      if (table) {
        table.querySelector('tbody')?.appendChild(row)
        block.remove()
      } else {
        block.replaceWith(poemWrap(kind, row))
      }
    }
    emit()
  }

  return (
    <div className="rich">
      <div className="rich-bar">
        <ToolButton label="عريض" onClick={() => cmd('bold')}><BoldIcon size={14} /></ToolButton>
        <ToolButton label="مائل" onClick={() => cmd('italic')}><ItalicIcon size={14} /></ToolButton>
        <ToolButton label="تحته خطّ" onClick={() => cmd('underline')}>
          <UnderlineIcon size={14} />
        </ToolButton>
        <ToolButton label="مشطوب" onClick={() => cmd('strikeThrough')}>
          <StrikeIcon size={14} />
        </ToolButton>
        <ToolButton label="تظليل" onClick={toggleHighlight}><HighlightIcon size={14} /></ToolButton>

        <span className="rich-sep" />

        <ToolButton label="قائمة" onClick={() => cmd('insertUnorderedList')}>
          <ListIcon size={14} />
        </ToolButton>
        <ToolButton label="قائمةٌ مُرقَّمة" onClick={() => cmd('insertOrderedList')}>
          <NumberedListIcon size={14} />
        </ToolButton>
        <ToolButton label="نقلٌ مُزاح" onClick={() => cmd('formatBlock', 'blockquote')}>
          <QuoteIcon size={14} />
        </ToolButton>

        <span className="rich-sep" />

        <ToolButton label="هامش" onClick={addFootnote}><NoteIcon size={14} /></ToolButton>
        <ToolButton
          label="رموز"
          on={symbolsOpen}
          onClick={() => setSymbolsOpen((v) => !v)}
        >
          <SymbolIcon size={14} />
        </ToolButton>

        <span className="rich-sep" />

        <ToolButton label="جرِّد التنسيق" onClick={() => cmd('removeFormat')}>
          <ClearIcon size={14} />
        </ToolButton>
        <span className="rich-poem-hint">
          <ScrollIcon size={12} />
          <span>صدرٌ * عَجُز — للبيت، و*الشطر* — للرجز</span>
        </span>
      </div>

      {symbolsOpen && (
        <div className="rich-symbols">
          {SYMBOL_GROUPS.map((group) => (
            <div key={group.label} className="rich-symbol-group">
              <span className="rich-symbol-label">{group.label}</span>
              <div className="rich-symbol-row">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    className={item.wide ? 'rich-symbol rich-symbol-wide' : 'rich-symbol'}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertText(item.text)}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rich-shell">
        {empty && placeholder && <span className="rich-placeholder">{placeholder}</span>}
        <div
          ref={ref}
          className={small ? 'rich-area rich-area-small prose' : 'rich-area prose'}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="نصّ الفائدة"
          onInput={() => { if (maybeFootnoteFromStars()) { emit(); return } emit() }}
          onBlur={() => layoutPoetry()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey) return
            // التصفيفُ بعد نزول السطر: السطرُ المتروك هو الذي يُصفّ
            requestAnimationFrame(() => layoutPoetry())
          }}
          // اللصقُ نصًّا مجرَّدًا: ما يُنسخ من متصفّحٍ يجرّ معه أنماطَ موقعه
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, text)
            emit()
          }}
        />
      </div>

      {footnotes.length > 0 && (
        <div className="rich-notes">
          <span className="rich-notes-label">الهوامش</span>
          <ol>
            {footnotes.map((note) => (
              <li key={note.id}>
                <input
                  value={note.text}
                  onChange={(e) => onFootnotes(footnotes.map(
                    (f) => (f.id === note.id ? { ...f, text: e.target.value } : f),
                  ))}
                  placeholder="نصُّ الهامش"
                  aria-label="نصُّ الهامش"
                />
                <button
                  type="button"
                  onClick={() => dropFootnote(note.id)}
                  title="احذف الهامش ومِسماكَه من النصّ"
                  aria-label="احذف الهامش"
                >
                  <ClearIcon size={12} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function ToolButton(
  { label, onClick, children, on }: {
    label: string
    onClick: () => void
    children: React.ReactNode
    on?: boolean
  },
) {
  return (
    <button
      type="button"
      className={on ? 'rich-tool rich-tool-on' : 'rich-tool'}
      title={label}
      aria-label={label}
      // الضغطُ لا يُفقِد اللوحَ تركيزَه، وإلّا ضاع الاختيارُ قبل أن يُنسَّق
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// أدواتٌ على شجرة اللوح
// ---------------------------------------------------------------------------

const tableClass = (kind: 'verse' | 'rajaz') => (kind === 'rajaz' ? 'rajaz-table' : 'poetry-table')

/** لوحُ الشعر: جدولٌ في إطاره، كما يُعرض في البطاقة سواءً بسواء */
function poemWrap(kind: 'verse' | 'rajaz', row: HTMLTableRowElement): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = kind === 'rajaz' ? 'poem-wrap poem-wrap-rajaz' : 'poem-wrap'
  const table = document.createElement('table')
  table.className = tableClass(kind)
  const body = document.createElement('tbody')
  body.appendChild(row)
  table.appendChild(body)
  wrap.appendChild(table)
  return wrap
}

/**
 * صفُّ البيت أو الشطر. و`data-original` يحمل الشطرَ قبل مدّه بالتطويل: عليه
 * يُقاس المدُّ في كل مرّة — والقياسُ على الممدود يزيده مدًّا على مدّ.
 */
function shatrRow(parts: string[], rajaz: boolean): HTMLTableRowElement {
  const row = document.createElement('tr')
  if (rajaz) {
    row.appendChild(cell('rajaz-shatr', parts[0]))
  } else {
    row.appendChild(cell('shatr shatr-first', parts[0]))
    row.appendChild(cell('shatr shatr-last', parts[1]))
  }
  const no = document.createElement('td')
  no.className = 'bayt-no'
  no.contentEditable = 'false'
  row.appendChild(no)
  return row
}

function cell(className: string, text: string): HTMLTableCellElement {
  const td = document.createElement('td')
  td.className = className
  td.dataset.original = text
  td.textContent = text
  return td
}

function makeMarker(id: string): HTMLElement {
  const sup = document.createElement('sup')
  sup.className = 'fn'
  sup.setAttribute('data-fn', id)
  sup.contentEditable = 'false'
  return sup
}

/**
 * مِسماكاتُ الهوامش وأرقامُ الأبيات لا تُكتب فيها: هي عدٌّ لا نصّ. وصفةُ
 * «لا تُحرَّر» تسقط في التشذيب عند الحفظ، فتُعاد عند فتح المُحرِّر.
 */
function hardenMarks(root: HTMLElement) {
  root.querySelectorAll('sup.fn, td.bayt-no').forEach((el) => {
    (el as HTMLElement).contentEditable = 'false'
  })
}

function insertNode(node: Node) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  range.insertNode(node)
  placeCaretAfter(node)
}

function placeCaretAfter(node: Node) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** أقربُ جدٍّ بهذا الوسم دون أن يُتجاوز اللوحُ نفسه */
function closestIn(node: Node | null, root: HTMLElement, tag: string): HTMLElement | null {
  let cur: Node | null = node
  while (cur && cur !== root) {
    if (cur.nodeType === Node.ELEMENT_NODE && (cur as Element).tagName === tag) {
      return cur as HTMLElement
    }
    cur = cur.parentNode
  }
  return null
}
