// طباعةُ الفائدة والكرّاسة.
//
// على مثال ورقة بطاقة الكتاب (`BookDetail.PrintSheet`): ورقةٌ تُركَّب في
// `document.body` لا في شجرة الصفحة — الطباعةُ تطوي `#root` كلَّه — ولا تُرى
// على الشاشة. **والفرقُ أنها لا تُركَّب حتى تُطلب**: بطاقةُ الكتاب ورقتُها
// واحدةٌ معلومة، والكرّاسةُ قد تكون مئةَ فائدة، فلا يُرسم ذلك كلُّه في صفحةٍ
// لم يُضغط فيها زرُّ الطباعة. فتُركَّب الورقة، ثم يُطبع، ثم تُرفع.
//
// والكرّاسةُ بحثٌ مصغَّر، فورقتُها كذلك: عنوانُها ووصفُها، ثم فصولُها وفوائدُها
// على ترتيبها، لكلٍّ عزوُه تحته. وهي ما يُحفظ PDF من نافذة الطباعة.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LIBRARY_NAME, type Author, type Book, type Perk } from '../lib/types'
import { perkCitation } from '../lib/citation'
import { resolveAsset } from './ui'
import RichText from './RichText'
import { PerkComment } from './PerkCard'

/**
 * مهمّةُ طباعة: `print(ورقة)` يركّبها ثم يفتح نافذةَ الطباعة متى حلّت الخطوط
 * ورُسمت، ثم يرفعها بعد الطباعة. و`sheet` ما يُرسم في الصفحة ما دامت قائمة.
 */
export function usePrintJob() {
  const [sheet, setSheet] = useState<ReactNode>(null)

  useEffect(() => {
    if (!sheet) return
    let alive = true
    const done = () => { if (alive) setSheet(null) }
    window.addEventListener('afterprint', done, { once: true })
    // تُنتظر الخطوطُ ثم رسمتان، فلا يُطبع النصُّ بخطٍّ بديلٍ ولا قبل أن يُصفّ
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (alive) window.print()
      }))
    })
    return () => {
      alive = false
      window.removeEventListener('afterprint', done)
    }
  }, [sheet])

  const print = useCallback((node: ReactNode) => setSheet(node), [])
  return { print, sheet: sheet ? createPortal(sheet, document.body) : null }
}

/** صفٌّ في الورقة: فائدةٌ بكتابها ومؤلِّفه، أو عنوانُ فصل */
export type PrintEntry =
  | { kind: 'perk'; perk: Perk; book?: Book; author: Author | null }
  | { kind: 'heading'; text: string }

/**
 * ورقةُ الفوائد: فائدةٌ واحدة من صفحتها، أو كرّاسةٌ بفصولها. والعزوُ تحت كلّ
 * فائدة بصياغة جريدة المراجع نفسها (`perkCitation`)، فلا يفترق العزوُ بين
 * البطاقة والورقة.
 */
export function PerkSheet(
  { title, note, kicker, entries, link, single }: {
    title: string
    /** فائدةٌ واحدة: عنوانُها هو عنوانُ الورقة، فلا يُعاد فوق نصّها */
    single?: boolean
    note?: string
    /** ما فوق العنوان: «كرّاسةٌ من كنّاش المكتبة»، «فائدةٌ من كنّاش المكتبة» */
    kicker: string
    entries: PrintEntry[]
    link: string
  },
) {
  return (
    <div className="print-sheet kn-print" aria-hidden="true">
      <header className="print-head">
        <img src={resolveAsset('assets/logo.svg') ?? ''} alt="" className="print-logo" />
        <div>
          <div className="print-library">{LIBRARY_NAME}</div>
          <div className="print-sub">{kicker}</div>
        </div>
      </header>

      <h1 className="print-title">{title}</h1>
      {note && <p className="kn-print-note">{note}</p>}

      {entries.map((e, i) => (e.kind === 'heading'
        ? <h2 key={`h${i}`} className="kn-print-heading">{e.text}</h2>
        : (
          <article key={e.perk.id} className="kn-print-perk">
            {e.perk.title && !single && <h3>{e.perk.title}</h3>}
            <RichText html={e.perk.text_html} text={e.perk.text} footnotes={e.perk.footnotes} />
            {e.perk.comment && <PerkComment text={e.perk.comment} />}
            <p className="kn-print-cite">{perkCitation(e.perk, e.book, e.author, false)}</p>
          </article>
        )))}

      <footer className="print-foot">
        <div className="print-link">{link}</div>
      </footer>
    </div>
  )
}
