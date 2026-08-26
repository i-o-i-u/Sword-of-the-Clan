// إدراجُ الشعر في نصّ القيد.
//
// زرّان تحت الحقل: «بيت شعر» و«شطر رجز». يفتح أحدُهما لوحًا فيه حقلٌ واحد
// — للبيت: صدرُه وعَجُزه تفصل بينهما نجمة، وللرجز: شطرُه — وإلى جانبه زرُّ
// زائدٍ يزيد حقلًا آخر. فإذا تمّ أُدرج ما كُتب **في موضع مؤشِّر الكتابة**
// من الحقل، لا في آخره: قد يُقحَم البيتُ في وسط الكلام.
//
// وما يُدرَج أسطرٌ نصّيّة لا عُقَدٌ في مُحرِّر: `صدرٌ * عَجُز` و`* شطر` —
// فيبقى نصُّ القيد نصًّا يُنسخ ويُبحث فيه ويُحفظ كما هو، ويعرف
// `lib/poetry.ts` كيف يصفّه في جدوله عند العرض.

import { useState, type RefObject } from 'react'
import { rajazLine, verseLine } from '../lib/poetry'
import { ClearIcon, QuoteIcon, ScrollIcon, ghostButtonStyle, inputStyle } from './ui'

type Mode = 'verse' | 'rajaz'

interface Props {
  /** الحقلُ الذي يُدرَج فيه، ليُعرف موضعُ مؤشِّره */
  areaRef: RefObject<HTMLTextAreaElement>
  value: string
  onChange: (next: string) => void
}

export default function PoetryComposer({ areaRef, value, onChange }: Props) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [rows, setRows] = useState<string[]>([''])

  function open(next: Mode) {
    setMode((cur) => (cur === next ? null : next))
    setRows([''])
  }

  const ready = rows.some((r) => filled(r, mode))

  function insert() {
    if (!mode) return
    const lines = rows
      .map((r) => r.trim())
      .filter((r) => filled(r, mode))
      .map((r) => {
        if (mode === 'rajaz') return rajazLine(r)
        const [first, second] = r.split(/\s*\*\s*/)
        return verseLine(first ?? '', second ?? '')
      })
    if (!lines.length) return

    const area = areaRef.current
    const at = area ? area.selectionStart : value.length
    const before = value.slice(0, at)
    const after = value.slice(at)

    // البيتُ يستقلّ بسطره: يُفصل عمّا قبله وعمّا بعده إن لم يكونا فارغَين
    const head = before && !before.endsWith('\n') ? before + '\n' : before
    const tail = after && !after.startsWith('\n') ? '\n' + after : after
    const body = lines.join('\n')
    const next = head + body + (tail || '\n')

    onChange(next)
    setMode(null)
    setRows([''])

    // ويُردّ المؤشِّرُ إلى ما بعد المُدرَج ليُتابع الكتابةَ من حيث وقف
    const caret = head.length + body.length + 1
    requestAnimationFrame(() => {
      area?.focus()
      area?.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="poet-tools">
      <div className="poet-buttons">
        <button
          type="button"
          className={mode === 'verse' ? 'poet-btn poet-btn-on' : 'poet-btn'}
          onClick={() => open('verse')}
          aria-expanded={mode === 'verse'}
        >
          <QuoteIcon size={13} />
          إضافة بيت شعر
        </button>
        <button
          type="button"
          className={mode === 'rajaz' ? 'poet-btn poet-btn-on' : 'poet-btn'}
          onClick={() => open('rajaz')}
          aria-expanded={mode === 'rajaz'}
        >
          <ScrollIcon size={13} />
          إضافة شطر رَجَز
        </button>
      </div>

      {mode && (
        <div className="poet-panel">
          {rows.map((row, i) => (
            <div key={i} className="poet-row">
              <input
                value={row}
                onChange={(e) => setRows(rows.map((r, j) => (j === i ? e.target.value : r)))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  // Enter في آخر حقلٍ يزيد حقلًا، وفي غيره ينتقل إلى ما بعده
                  if (i === rows.length - 1) setRows([...rows, ''])
                }}
                placeholder={mode === 'verse'
                  ? 'صدرُ البيت * عَجُزه'
                  : 'شطرُ الرجز'}
                className="poet-input"
                style={inputStyle}
                autoFocus={i === rows.length - 1}
                aria-label={mode === 'verse' ? `البيت ${i + 1}` : `الشطر ${i + 1}`}
              />

              {/* زرُّ الزائد إلى جانب الحقل: يزيد بيتًا آخر */}
              {i === rows.length - 1 ? (
                <button
                  type="button"
                  className="poet-plus"
                  onClick={() => setRows([...rows, ''])}
                  title={mode === 'verse' ? 'بيتٌ آخر' : 'شطرٌ آخر'}
                  aria-label={mode === 'verse' ? 'بيتٌ آخر' : 'شطرٌ آخر'}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="poet-plus poet-drop"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  title="احذف هذا السطر"
                  aria-label="احذف هذا السطر"
                >
                  <ClearIcon size={12} />
                </button>
              )}
            </div>
          ))}

          <div className="poet-foot">
            <span className="perk-hint">
              {mode === 'verse'
                ? 'النجمةُ تفصل الصدرَ عن العَجُز. ويُمدُّ الشطران بالتطويل عند العرض حتى يستويا.'
                : 'الرجزُ شطرٌ شطرٌ في عمودٍ واحد، لا صدرَ فيه وعَجُز.'}
            </span>
            <button
              type="button"
              onClick={() => setMode(null)}
              style={ghostButtonStyle}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="poet-insert"
              disabled={!ready}
              onClick={insert}
            >
              أدرِجْه في النصّ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** البيتُ لا يُدرَج إلا بشطريه، والرجزُ يكفيه شطرُه */
function filled(row: string, mode: Mode | null): boolean {
  const t = row.trim()
  if (!t) return false
  if (mode !== 'verse') return true
  const [first, second] = t.split(/\s*\*\s*/)
  return !!(first?.trim() && second?.trim())
}
