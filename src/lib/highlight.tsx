// تظليلُ ما طابق البحث في النصّ المعروض.
//
// من بحث في الكنّاش عن كلمةٍ فوجد عشرين فائدة لم يكن يرى أين وقعت الكلمةُ من
// كلّ واحدة، فيقرأ الفائدةَ كلَّها ليجدها. فصارت تُظلَّل حيث وقعت، بنمطٍ يطابق
// كما يطابق البحثُ نفسُه (`search.highlightPattern`).
//
// وللنصّ صورتان: نصٌّ تحمله React — عنوانُ الفائدة وسطرُها في الفهرس — فيُقسم
// قطعًا (`Hl`)؛ ونصٌّ منسَّقٌ مرسومٌ من HTML لا تتولّاه React، فيُظلَّل في
// شجرته بعد رسمه (`highlightIn`) ويُفكّ تظليلُه قبل كل تظليلٍ جديد.

import type { ReactNode } from 'react'

/** النصُّ قطعًا: ما طابق في `mark` وما سواه كما هو */
export function Hl({ text, re }: { text: string; re: RegExp | null }): ReactNode {
  if (!re || !text) return text
  const out: ReactNode[] = []
  let last = 0
  re.lastIndex = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (!m[0]) { re.lastIndex += 1; continue }
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<mark key={m.index} className="kn-hit">{m[0]}</mark>)
    last = m.index + m[0].length
  }
  if (!out.length) return text
  if (last < text.length) out.push(text.slice(last))
  return out
}

/**
 * يُظلِّل في شجرةٍ مرسومة. **ولا يمسّ الأشطارَ ولا مِسماكات الهوامش**: الشطرُ
 * يُعاد كتابةُ نصّه في كل قياسٍ للمدّ (`data-original`) فيمحو ما وُضع فيه،
 * والمِسماكُ عدٌّ لا نصّ.
 */
export function highlightIn(root: HTMLElement, re: RegExp | null) {
  // ما ظُلِّل من قبلُ يُفكّ أوّلًا، فلا يتراكب تظليلٌ على تظليل
  root.querySelectorAll('mark.kn-hit').forEach((m) => {
    const parent = m.parentNode
    m.replaceWith(...m.childNodes)
    parent?.normalize()
  })
  if (!re) return

  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[data-original], sup, .bayt-no')
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT),
  })
  const nodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text)

  for (const node of nodes) {
    const text = node.data
    re.lastIndex = 0
    if (!re.test(text)) continue
    re.lastIndex = 0
    const frag = root.ownerDocument.createDocumentFragment()
    let last = 0
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (!m[0]) { re.lastIndex += 1; continue }
      if (m.index > last) frag.append(text.slice(last, m.index))
      const mark = root.ownerDocument.createElement('mark')
      mark.className = 'kn-hit'
      mark.textContent = m[0]
      frag.append(mark)
      last = m.index + m[0].length
    }
    if (last < text.length) frag.append(text.slice(last))
    node.replaceWith(frag)
  }
}
