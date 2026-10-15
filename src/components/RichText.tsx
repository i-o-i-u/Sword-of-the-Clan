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
// **ومِسماكُ الهامش رابطٌ إلى هامشه**، وفي الهامش رابطٌ يردّ إلى موضعه — كما
// في الكتب الرقمية. وكان المِسماكُ رقمًا ساكتًا، فمن أراد هامشَ الموضع الخامس
// في فائدةٍ طويلة عدّ الهوامشَ بعينه.
//
// **وما طابق البحث يُظلَّل** (`highlight`)، فيُرى أين وقعت الكلمةُ من الفائدة.
//
// وما لا HTML له — فائدةٌ قُيِّدت قبل المُحرِّر المنسَّق — يُعرض بـ`Prose`
// كما كان، فلا يضيع قديمٌ لأن الجديد جاء.

import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import { layoutPoemsHtml, orderedFootnotes, sanitizeHtml, type Footnote } from '../lib/richtext'
import { fitPoemWidth, fontOf, stretchShatr } from '../lib/tatweel'
import { highlightIn } from '../lib/highlight'
import { highlightPattern } from '../lib/search'
import Prose from './Prose'

export default function RichText(
  { html, text, footnotes = [], className = 'prose', highlight = '' }: {
    html: string
    /** النصُّ مجرَّدًا، يُعرض حين لا تنسيقَ محفوظًا */
    text: string
    footnotes?: Footnote[]
    className?: string
    /** ما بُحث به، فيُظلَّل حيث وقع */
    highlight?: string
  },
) {
  // والشعرُ يُصفّ عند العرض أيضًا: ما فات المُحرِّرَ صفُّه حين حُفظ يُعرض مصفوفًا
  const clean = useMemo(() => (html.trim() ? layoutPoemsHtml(sanitizeHtml(html)) : ''), [html])
  const notes = useMemo(() => orderedFootnotes(clean, footnotes), [clean, footnotes])
  const ref = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLOListElement>(null)
  const lastWidth = useRef(0)
  // مِسماكٌ يخصّ هذا العرض: قد تُعرض الفائدةُ في الصفحة الواحدة مرّتين
  const uid = useId().replace(/:/g, '')

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
      for (const wrap of host.querySelectorAll<HTMLElement>('.poem-wrap')) {
        const own = [...wrap.querySelectorAll<HTMLElement>('[data-original]')]
        fitPoemWidth(
          wrap,
          own.map((c) => c.dataset.original ?? ''),
          font,
          wrap.classList.contains('poem-wrap-rajaz') ? 1 : 2,
          wrap.querySelectorAll('tr').length > 1,
        )
      }
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
    // وخطٌّ يُختار بعد الرسم (`ensureWebFont`) يُغيّر عرضَ الحروف ولا يُغيّر
    // عرضَ اللوح، فلا يراه الراصد — فيُعاد القياسُ متى حلّ خطٌّ جديد
    const onFont = () => { if (alive) measure(true) }
    document.fonts?.addEventListener?.('loadingdone', onFont)
    return () => {
      alive = false
      observer.disconnect()
      document.fonts?.removeEventListener?.('loadingdone', onFont)
    }
  }, [clean])

  // المِسماكاتُ أزرارٌ تُبلغ بلوحة المفاتيح ويُخبر عنها قارئُ الشاشة
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('sup.fn').forEach((sup, i) => {
      sup.tabIndex = 0
      sup.setAttribute('role', 'link')
      sup.setAttribute('aria-label', `الهامش ${i + 1}`)
      sup.id = `${uid}-ref-${i}`
    })
  }, [clean, uid])

  useLayoutEffect(() => {
    if (ref.current) highlightIn(ref.current, highlightPattern(highlight))
  }, [clean, highlight])

  if (!clean) return <Prose text={text} className={className} />

  /** يمضي إلى الهامش أو يرجع منه، ويُضيئه لحظةً فيُرى أين وقع */
  function jump(target: HTMLElement | null | undefined) {
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
    target.classList.remove('rich-flash')
    void target.offsetWidth
    target.classList.add('rich-flash')
  }

  function toNote(sup: Element) {
    const all = [...(ref.current?.querySelectorAll('sup.fn') ?? [])]
    const i = all.indexOf(sup)
    if (i >= 0) jump(notesRef.current?.children[i] as HTMLElement | undefined)
  }

  return (
    <>
      <div
        ref={ref}
        className={`rich-view ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
        onClick={(e) => {
          const sup = (e.target as Element).closest('sup.fn')
          if (sup) { e.preventDefault(); toNote(sup) }
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          const sup = (e.target as Element).closest('sup.fn')
          if (sup) { e.preventDefault(); toNote(sup) }
        }}
      />
      {notes.length > 0 && (
        <ol className="rich-view-notes" ref={notesRef}>
          {notes.map((n, i) => (
            <li key={n.id} className="rich-view-note" tabIndex={-1}>
              <span>{n.text}</span>
              <button
                type="button"
                className="rich-note-back"
                onClick={() => jump(document.getElementById(`${uid}-ref-${i}`))}
                title="ارجع إلى موضعه من النصّ"
                aria-label="ارجع إلى موضع الهامش"
              >
                ↩
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
