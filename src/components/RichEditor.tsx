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

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CELL_SELECTOR, SYMBOL_GROUPS, dropEmptyPoems, escapeHtml, layoutPoems, newFootnoteId,
  orderedFootnotes, rowLine, splitPoemAfter, type Footnote,
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
    roomAround(el)
    setEmpty(!el.textContent?.trim())
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* لا يضرّ */ }
    // مرّةً واحدة عند فتح النموذج: الفائدةُ المُعدَّلة تُفتح بنموذجٍ جديد
    // (`key` في موضع النداء)، فلا حاجة إلى إعادة الملء عند كل تبدُّل
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * يُخبر الأعلى بما في اللوح الآن.
   *
   * **وأصلُ الشطر يتبع ما كُتب فيه** (`data-original`): الشطرُ يُعرض بعد الحفظ
   * ممدودًا من أصله لا من نصّه، فمن صحّح كلمةً في خليّة البيت هنا ولم يتبعها
   * الأصلُ عُرض البيتُ بعد الحفظ كما كان قبل التصحيح، وبُحث فيه كذلك. واللوحُ
   * لا يُمدّ فيه شطر، فنصُّ الخليّة هنا هو الأصلُ نفسُه.
   *
   * **والبيتُ الذي مُحي نصُّه يُرفع** إلا ما فيه المؤشِّر (`dropEmptyPoems`).
   */
  function emit() {
    const el = ref.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('td[data-original]').forEach((td) => {
      const text = (td.textContent ?? '').trim()
      if (td.dataset.original !== text) td.dataset.original = text
    })
    dropEmptyPoems(el, window.getSelection()?.anchorNode ?? null)
    setEmpty(!el.textContent?.trim())
    onChange(el.innerHTML)
  }

  /** خليّةُ الشطر التي فيها المؤشِّر، إن كان في بيت */
  function caretCell(): HTMLElement | null {
    const anchor = window.getSelection()?.anchorNode ?? null
    const el = ref.current
    if (!anchor || !el) return null
    const cell = (anchor.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor.parentElement)
      ?.closest<HTMLElement>(CELL_SELECTOR)
    return cell && el.contains(cell) ? cell : null
  }

  /**
   * **Enter في البيت يُنزل إلى سطرٍ جديدٍ بعده**، لا في جوف خليّته: يُفتح بعد
   * البيت سطرٌ فارغ يُكتب فيه البيتُ التالي على علامته — `صدرٌ * عَجُز` — فيُضمّ
   * إلى القصيدة متى نزل عنه الكاتب، أو يبقى سطرَ نثرٍ بعدها. وإن كان البيتُ في
   * وسط القصيدة انفصل ما بعده لوحًا يلي السطرَ الجديد، فيُقحَم البيتُ في موضعه.
   *
   * وكان Enter يكسر الخليّةَ نفسَها، فيُكتب البيتُ التالي في خليّة الذي قبله ولا
   * يُنزل إلى ما بعد القصيدة أبدًا.
   */
  function newLineAfterVerse(e: React.KeyboardEvent) {
    // وCtrl+Enter حفظٌ لا سطر: يمضي إلى النموذج
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return false
    const cell = caretCell()
    const row = cell?.closest('tr')
    const wrap = cell?.closest('.poem-wrap')
    if (!cell || !row || !wrap) return false
    e.preventDefault()
    splitPoemAfter(row)
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    wrap.after(p)
    placeCaretAtStart(p)
    emit()
    return true
  }

  /**
   * **Backspace في أوّل البيت يردّه سطرًا يُحرَّر**: `صدرٌ * عَجُز` على علامته،
   * في موضعه من القصيدة. فيُصحَّح فيه ما شاء الكاتب — يُنقل لفظٌ من الصدر إلى
   * العَجُز، أو يُمحى البيتُ كلُّه — ثم يُصفّ ويُضمّ متى نزل عنه. وكان البيتُ
   * المصفوف لا يُردّ نصًّا، ولا يُحذف إلا بتحديد ما حوله.
   */
  function verseToLine(e: React.KeyboardEvent) {
    if (e.key !== 'Backspace') return false
    const sel = window.getSelection()
    const cell = caretCell()
    const row = cell?.closest('tr')
    const wrap = cell?.closest('.poem-wrap')
    if (!sel || !sel.isCollapsed || !cell || !row || !wrap) return false
    // في أوّل خليّةٍ من البيت، وفي أوّلها لا في وسطها
    if (row.querySelector(CELL_SELECTOR) !== cell) return false
    const before = document.createRange()
    before.selectNodeContents(cell)
    before.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset)
    if (before.toString().length > 0) return false
    const line = rowLine(row)
    if (!line.replace(/\*/g, '').trim()) return false // البيتُ الفارغ يُرفع في `dropEmptyRow`

    e.preventDefault()
    splitPoemAfter(row)
    row.remove()
    const p = document.createElement('p')
    p.textContent = line
    if (wrap.querySelector('tr')) wrap.after(p)
    else wrap.replaceWith(p)
    placeCaretAtStart(p)
    emit()
    return true
  }

  /**
   * Backspace أو Delete في بيتٍ لم يبقَ فيه نصّ: يُرفع البيتُ ويقف المؤشِّرُ في
   * آخر ما قبله. وكان المؤشِّرُ يدور في الخليّتين الفارغتين ولا يخرج، فلا سبيلَ
   * إلى رفع البيت إلّا بتحديد ما حوله ومحوه.
   */
  function dropEmptyRow(e: React.KeyboardEvent) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return false
    const anchor = window.getSelection()?.anchorNode ?? null
    const el = ref.current
    if (!anchor || !el) return false
    const row = (anchor.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor.parentElement)
      ?.closest('.poem-wrap tr')
    if (!row || !el.contains(row)) return false
    const cells = [...row.querySelectorAll('td')].filter((td) => !td.classList.contains('bayt-no'))
    if (cells.some((td) => (td.textContent ?? '').trim())) return false

    e.preventDefault()
    const wrap = row.closest('.poem-wrap')!
    const prevRow = row.previousElementSibling
    const nextRow = row.nextElementSibling
    row.remove()
    // المؤشِّرُ إلى البيت الذي قبله إن كان، وإلّا فإلى ما قبل اللوح
    const target = [...(prevRow?.querySelectorAll(CELL_SELECTOR) ?? [])].pop()
      ?? nextRow?.querySelector(CELL_SELECTOR)
      ?? null
    if (!wrap.querySelector('tr')) {
      const before = wrap.previousElementSibling
      const p = document.createElement('p')
      p.appendChild(document.createElement('br'))
      wrap.replaceWith(p)
      placeCaretAtEnd(before && !before.classList.contains('poem-wrap') ? before : p)
    } else if (target) {
      placeCaretAtEnd(target)
    }
    emit()
    return true
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
    // اللوحُ قد لا يكون فيه مؤشِّرٌ بعدُ — يُضغط الزرُّ قبل أن يُكتب شيء —
    // فيُوضع في آخره: مِسماكٌ في غير موضعٍ خيرٌ من هامشٍ بلا مِسماك يسقط
    // عند الحفظ ولا يُدرى أين ذهب
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) {
      const end = document.createRange()
      end.selectNodeContents(el)
      end.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(end)
    }
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
   *
   * فإذا خرج المؤشِّرُ من اللوح (`all`) صُفَّ كلُّ شيء: لا مؤشِّرَ يُخشى عليه،
   * ولو تُرك السطرُ الأخير لخرج بيتٌ منثورًا بين الأبيات — والاختيارُ يبقى
   * قائمًا بعد الخروج في بعض المتصفّحات، فلا يكفي أن يُسأل عنه.
   */
  function layoutPoetry(all = false) {
    const el = ref.current
    if (!el) return
    const anchor = all ? null : (window.getSelection()?.anchorNode ?? null)
    // الصفُّ في `lib/richtext` لا هنا: العرضُ يصفّ بالدالّة نفسها ما فات المُحرِّرَ،
    // ويُفصل فيها السطرُ عن السطر قبل الصفّ — البيتُ بعد «قال الشاعر:» بسطرٍ
    // لا بفقرة كان يبقى منثورًا
    if (layoutPoems(el, anchor)) {
      hardenMarks(el)
      roomAround(el)
      emit()
    }
  }

  /**
   * الهوامشُ على ترتيب مِسماكاتها في النصّ لا على ترتيب إضافتها. والرقمُ في
   * النصّ عدٌّ على المواضع، فلو رُتّبت القائمةُ بالإضافة لكان الهامشُ المُقحَم
   * في أوّل النصّ «١» هناك و«٣» ههنا — فيُكتب نصُّه في غير موضعه. وما مُحي
   * مِسماكُه لا يُعرض: يسقط عند الحفظ، ويعود إن رُدّ المِسماكُ بالتراجع.
   */
  const notes = useMemo(() => orderedFootnotes(html, footnotes), [html, footnotes])

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
          onBlur={() => layoutPoetry(true)}
          onKeyDown={(e) => {
            if (dropEmptyRow(e)) return
            if (verseToLine(e)) return
            if (newLineAfterVerse(e)) return
            if (e.key !== 'Enter' || e.shiftKey) return
            // التصفيفُ بعد نزول السطر: السطرُ المتروك هو الذي يُصفّ
            requestAnimationFrame(() => layoutPoetry())
          }}
          // اللصقُ نصًّا مجرَّدًا: ما يُنسخ من متصفّحٍ يجرّ معه أنماطَ موقعه
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')
            // والشطرُ سطرٌ واحد: ما يُلصق في خليّته يُلصق سطرًا، وأسطرُه فراغات
            if (caretCell()) {
              document.execCommand('insertText', false, text.replace(/\s*\n\s*/g, ' '))
              emit()
              return
            }
            // ونصٌّ ذو أسطرٍ يُدرَج فقراتٍ لا نصًّا واحدًا: `insertText` يُبقي في
            // فيرفكس حرفَ السطر في عقدةٍ واحدة، فلا يرى الصفُّ في الأبيات أسطرًا
            if (text.includes('\n')) {
              const html = text.split('\n')
                .map((line) => `<p>${line.trim() ? escapeHtml(line) : '<br>'}</p>`)
                .join('')
              document.execCommand('insertHTML', false, html)
              requestAnimationFrame(() => layoutPoetry())
            } else {
              document.execCommand('insertText', false, text)
            }
            emit()
          }}
        />
      </div>

      {notes.length > 0 && (
        <div className="rich-notes">
          <span className="rich-notes-label">الهوامش</span>
          <ol>
            {notes.map((note) => (
              <li key={note.id}>
                <input
                  value={note.text}
                  onChange={(e) => {
                    const text = e.target.value
                    // ومِسماكٌ لا هامشَ له بعدُ — لُصق أو رُدّ بالتراجع — يُنشأ هامشُه الآن
                    onFootnotes(footnotes.some((f) => f.id === note.id)
                      ? footnotes.map((f) => (f.id === note.id ? { ...f, text } : f))
                      : [...footnotes, { id: note.id, text }])
                  }}
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

/** يضع المؤشِّرَ في أوّل العنصر */
function placeCaretAtStart(node: Node) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.setStart(node, 0)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * سطرٌ فارغٌ قبل الشعر وبعده إن كان في طرف اللوح: المؤشِّرُ لا يخرج من جدولٍ
 * لا شيءَ بعده، فلا يُنزل إلى ما بعد القصيدة ولا يُصعد إلى ما قبلها. ويُرفع
 * الفارغُ من الطرفين عند الحفظ (`trimBlankEdges`)، فلا يُحفظ فراغًا.
 */
function roomAround(root: HTMLElement) {
  const blank = () => {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    return p
  }
  if (root.lastElementChild?.classList.contains('poem-wrap')) root.appendChild(blank())
  if (root.firstElementChild?.classList.contains('poem-wrap')) root.prepend(blank())
}

/** يضع المؤشِّرَ في آخر العنصر */
function placeCaretAtEnd(node: Node) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
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
