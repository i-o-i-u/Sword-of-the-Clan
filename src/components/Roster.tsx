// سِجِلٌّ يُعرض بطريقتين: شبكةَ بطاقاتٍ أو جدولًا.
//
// وهو قطعةٌ واحدة تخدم صفحاتِ المؤلِّفين ودُور النَّشْر و«المحقِّقون ونحوهم»
// جميعًا — الثلاثُ سجلَّاتُ أسماءٍ لكلٍّ منها صفحة، فلا يفترق شكلُها ولا
// يُكتب التبديلُ ثلاثَ مرّات.
//
// والشبكةُ للتصفُّح على مهل: فيها للاسم قرصُه وأسطرُه. والجدولُ للمقارنة
// والمسح السريع بالعين: صفٌّ لكلّ اسمٍ وأعمدةٌ مصطفّة، ينفع حين يكثر العدد.
// واختيارُ القارئ يُحفظ في متصفّحه فلا يُعاد في كل زيارة.

import { useCallback, useState, type ReactNode } from 'react'
import { GridIcon, TableIcon, viewToggleStyle } from './ui'

export type RosterView = 'grid' | 'table'

/** سطرٌ في السجلّ: اسمٌ وعلامةٌ وأسطرٌ تحته في الشبكة، وخلايا في الجدول */
export interface RosterRow {
  id: string
  name: string
  /** القرصُ أو الشعار عن يمين البطاقة */
  mark: ReactNode
  /** ما يُعرض تحت الاسم في الشبكة. وما كان فارغًا لا يُعرض. */
  lines: { icon: ReactNode; text: string; tone?: 'accent' }[]
  /** خلايا الجدول بعد عمود الاسم، على ترتيب `headers` */
  cells: ReactNode[]
  onOpen: () => void
}

const PREF_KEY = 'lib-roster-view'

/**
 * طريقةُ العرض المختارة، محفوظةً في متصفّح القارئ لا في المكتبة: هذا
 * تفضيلُه لنفسه لا يُغيّر ما يراه غيره — كالمظهر والخطّ سواءً.
 *
 * و`scope` يفرد لكل سجلٍّ اختيارَه: قد يريد المؤلِّفين شبكةً والدُّورَ جدولًا.
 */
export function useRosterView(scope: string): [RosterView, (v: RosterView) => void] {
  const [view, setView] = useState<RosterView>(() => {
    try {
      return localStorage.getItem(`${PREF_KEY}:${scope}`) === 'table' ? 'table' : 'grid'
    } catch { return 'grid' }
  })

  const choose = useCallback((next: RosterView) => {
    setView(next)
    try { localStorage.setItem(`${PREF_KEY}:${scope}`, next) } catch { /* لا يضرّ */ }
  }, [scope])

  return [view, choose]
}

/** زرّا التبديل: أيقونتان لا اسمان، فالشكلان معروفان بصورتيهما */
export function RosterToggle(
  { view, onChange }: { view: RosterView; onChange: (v: RosterView) => void },
) {
  return (
    <div className="roster-toggle" role="group" aria-label="طريقة العرض">
      <button
        type="button"
        onClick={() => onChange('grid')}
        title="عرضُ بطاقات"
        aria-label="عرضُ بطاقات"
        aria-pressed={view === 'grid'}
        style={viewToggleStyle(view === 'grid')}
      >
        <GridIcon size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        title="عرضُ جدول"
        aria-label="عرضُ جدول"
        aria-pressed={view === 'table'}
        style={viewToggleStyle(view === 'table')}
      >
        <TableIcon size={16} />
      </button>
    </div>
  )
}

export default function Roster(
  { rows, view, headers }: { rows: RosterRow[]; view: RosterView; headers: string[] },
) {
  if (view === 'table') {
    return (
      <div className="roster-scroll">
        <table className="roster-table">
          <thead>
            <tr>
              <th>الاسم</th>
              {headers.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="row-hover" onClick={row.onOpen}>
                <td className="roster-name-cell">
                  <span className="roster-mark-sm">{row.mark}</span>
                  <span>{row.name}</span>
                </td>
                {row.cells.map((c, i) => <td key={i}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="author-grid">
      {rows.map((row) => (
        <div key={row.id} className="author-card" onClick={row.onOpen}>
          <span className="author-mark" aria-hidden="true">{row.mark}</span>
          <div style={{ minWidth: 0 }}>
            <div className="author-name">{row.name}</div>
            {/* لا يُعرض سطرٌ فارغ ولا أيقونتُه: الفراغُ ليس خبرًا */}
            {row.lines.filter((l) => l.text).map((l, i) => (
              <div key={i} className={l.tone === 'accent' ? 'author-books' : 'author-life'}>
                {l.icon}
                {l.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
