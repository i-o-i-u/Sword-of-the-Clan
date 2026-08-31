// عرضُ النصّ المجرَّد: نثرُه نثرًا، وشعرُه مصفوفًا في جدوله ممدودَ الأشطار.
//
// وهو عارضُ تعليقِ المُقيِّد وما قُيِّد قبل المُحرِّر المنسَّق. وأمّا النصُّ
// المنسَّق فعارضُه `RichText`.
//
// والمدُّ يُقاس بعد الرسم لا قبله: عرضُ الشطر لا يُعرف إلا وقد وُضع في
// موضعه، فتُقاس الخليّةُ ثم يُحسب لها نصُّها الممدود. ويُعاد الحسابُ عند
// تبدُّل العرض (`ResizeObserver`) وعند حلول الخطّ (`document.fonts`) —
// فالقياسُ بخطٍّ لم يصل بعدُ قياسٌ على غير المرسوم.

import { useLayoutEffect, useRef, useState } from 'react'
import { parsePoetry, type PoemLine } from '../lib/poetry'
import { fontOf, stretchShatr } from '../lib/tatweel'

/**
 * النصّ المعروض. `className` يُمرَّر إلى فقرات النثر وحدها — الشعرُ له
 * هيئتُه، ولا يُضبط طرفاه ولا يُلفّ سطرُه.
 */
export default function Prose(
  { text, className = 'prose' }: { text: string; className?: string },
) {
  const blocks = parsePoetry(text)

  // نثرٌ محض: لا يُبنى له شيء زائد، ويبقى كما كان قبل الشعر سواءً بسواء
  if (blocks.length === 1 && blocks[0].kind === 'prose') {
    return <div className={className}>{blocks[0].text}</div>
  }

  return (
    <div className="text-blocks">
      {blocks.map((b, i) => (
        b.kind === 'prose'
          ? <div key={i} className={className}>{b.text}</div>
          : <Poem key={i} kind={b.kind} lines={b.lines} />
      ))}
    </div>
  )
}

/**
 * جدولُ الشعر: بيتٌ في كل صفّ، وشطرٌ في كل خليّة. و`table-layout: fixed`
 * شرطٌ لا زينة — به يُعرف عرضُ الخليّة قبل أن يُملأ، فيُقاس عليه المدّ.
 */
function Poem({ kind, lines }: { kind: 'verse' | 'rajaz'; lines: PoemLine[] }) {
  const ref = useRef<HTMLTableElement>(null)
  /** الأشطارُ ممدودةً، بمفتاح «رقم البيت:الشطر». وقبل القياس تُعرض كما هي. */
  const [stretched, setStretched] = useState<Record<string, string>>({})
  const lastWidth = useRef(0)

  const rajaz = kind === 'rajaz'

  useLayoutEffect(() => {
    const table = ref.current
    if (!table) return

    function measure(force = false) {
      const el = ref.current
      if (!el) return
      const cells = [...el.querySelectorAll<HTMLElement>('.shatr, .rajaz-shatr')]
      if (!cells.length) return

      // العرضُ نفسُه لم يتبدّل، فلا يُعاد الحساب
      const width = el.clientWidth
      if (!force && width === lastWidth.current) return
      lastWidth.current = width

      const font = fontOf(cells[0])
      const next: Record<string, string> = {}
      for (const cell of cells) {
        const key = cell.dataset.key
        const original = cell.dataset.original
        if (!key || !original) continue
        const cs = getComputedStyle(cell)
        const inner = cell.clientWidth
          - parseFloat(cs.paddingInlineStart || '0')
          - parseFloat(cs.paddingInlineEnd || '0')
        next[key] = stretchShatr(original, inner, font)
      }
      setStretched(next)
    }

    measure(true)

    const observer = new ResizeObserver(() => measure())
    observer.observe(table)

    // الخطُّ يحلّ بعد أوّل رسمٍ أحيانًا، والقياسُ عليه قبل حلوله قياسٌ على
    // غيره — فيُعاد متى حلّ
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure(true) })

    return () => { alive = false; observer.disconnect() }
  }, [lines])

  return (
    <div className={rajaz ? 'poem-wrap poem-wrap-rajaz' : 'poem-wrap'}>
      <table ref={ref} className={rajaz ? 'rajaz-table' : 'poetry-table'}>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              {rajaz ? (
                <Cell className="rajaz-shatr" k={`${i}:0`} text={line.first} shown={stretched[`${i}:0`]} />
              ) : (
                <>
                  <Cell className="shatr shatr-first" k={`${i}:0`} text={line.first} shown={stretched[`${i}:0`]} />
                  <Cell className="shatr shatr-last" k={`${i}:1`} text={line.second} shown={stretched[`${i}:1`]} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * خليّةُ الشطر. الأصلُ محفوظٌ في `data-original` كي يُقاس عليه في كل مرّة:
 * القياسُ على الممدود يزيده مدًّا على مدّ. وهو أيضًا ما يُنسخ إن نسخ
 * القارئُ — لا، بل تُجرَّد الوصلاتُ عند النسخ في `stripTatweel`.
 */
function Cell(
  { className, k, text, shown }: { className: string; k: string; text: string; shown?: string },
) {
  return (
    <td className={className} data-key={k} data-original={text}>
      {shown ?? text}
    </td>
  )
}
