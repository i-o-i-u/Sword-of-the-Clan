// عرضُ نصّ الفائدة المنسَّق.
//
// النصُّ محفوظٌ HTML، فيُرسم كما كُتب — **بعد تشذيبه** لا قبله: التشذيبُ عند
// الحفظ يمرّ من الواجهة مرّةً، وعند الرسم يمرّ على كل زائر. فهذا هو الحارس،
// وذاك زيادةُ احتياط.
//
// والأشطارُ تُمدّ بالتطويل ههنا كما تُمدّ في `Prose`: القياسُ بعد الرسم لا
// قبله، ويُعاد عند تبدُّل العرض وعند حلول الخطّ. والفرقُ أنّ الأشطار ههنا
// في شجرةٍ جاءت من HTML لا من قائمةٍ في الذاكرة، فيُكتب الممدودُ في الخليّة
// نفسها — والأصلُ محفوظٌ في `data-original` يُقاس عليه في كل مرّة.
//
// وما لا HTML له — فائدةٌ قُيِّدت قبل المُحرِّر المنسَّق — يُعرض بـ`Prose`
// كما كان، فلا يضيع قديمٌ لأن الجديد جاء.

import { useLayoutEffect, useMemo, useRef } from 'react'
import { orderedFootnotes, sanitizeHtml, type Footnote } from '../lib/richtext'
import { fontOf, stretchShatr } from '../lib/tatweel'
import Prose from './Prose'

export default function RichText(
  { html, text, footnotes = [], className = 'prose' }: {
    html: string
    /** النصُّ مجرَّدًا، يُعرض حين لا تنسيقَ محفوظًا */
    text: string
    footnotes?: Footnote[]
    className?: string
  },
) {
  const clean = useMemo(() => (html.trim() ? sanitizeHtml(html) : ''), [html])
  const notes = useMemo(() => orderedFootnotes(clean, footnotes), [clean, footnotes])
  const ref = useRef<HTMLDivElement>(null)
  const lastWidth = useRef(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    function measure(force = false) {
      const host = ref.current
      if (!host) return
      const cells = [...host.querySelectorAll<HTMLElement>('[data-original]')]
      if (!cells.length) return
      const width = host.clientWidth
      if (!force && width === lastWidth.current) return
      lastWidth.current = width

      const font = fontOf(cells[0])
      for (const cell of cells) {
        const original = cell.dataset.original
        if (!original) continue
        const cs = getComputedStyle(cell)
        const inner = cell.clientWidth
          - parseFloat(cs.paddingInlineStart || '0')
          - parseFloat(cs.paddingInlineEnd || '0')
        cell.textContent = stretchShatr(original, inner, font)
      }
    }

    measure(true)
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)

    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure(true) })
    return () => { alive = false; observer.disconnect() }
  }, [clean])

  if (!clean) return <Prose text={text} className={className} />

  return (
    <>
      <div
        ref={ref}
        className={`rich-view ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      {notes.length > 0 && (
        <ol className="rich-view-notes">
          {notes.map((n) => <Note key={n.id} note={n} />)}
        </ol>
      )}
    </>
  )
}

/** الهامشُ لا رقمَ مكتوبٌ فيه: الرقمُ عدٌّ في ملف الأنماط كترقيم مِسماكه */
function Note({ note }: { note: Footnote }) {
  return <li className="rich-view-note">{note.text}</li>
}
