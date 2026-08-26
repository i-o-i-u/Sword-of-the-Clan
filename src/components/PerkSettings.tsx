// إعدادات الكنّاش: أنواعُ القيد.
//
// أبوابُ الكنّاش لصاحبه: يزيد نوعًا ويُعدِّل اسمَ نوع. وكانت قائمةً مغلقةً
// في المخطّط تُملى عليه، والقيدُ عملُه هو فالتسميةُ تسميتُه.
//
// وتعديلُ الاسم يُزامَن على قيوده في الخادم (`catalog.renamePerkKind`)، كما
// يُزامَن اسمُ المؤلِّف على كتبه — وإغفالُه يترك قيودًا موسومةً بنوعٍ لا
// وجود له فلا تُصفَّى به.
//
// والنوعُ الذي عليه قيودٌ لا يُحذف: حذفُه لا يمحو قيودَه — يُعيدها
// `perkKindsOf` إلى القائمة كي لا يسقط قيدٌ من السيل — فيبقى الاسمُ ويظهر
// أنّ الحذف لم يقع. فيُقال ذلك صراحةً، ويُعرض عددُ قيوده.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { PERKS_COUNT, countLabel, perkKindsOf } from '../lib/types'
import {
  ClearIcon, CloseButton, Overlay, ghostButtonStyle, inputStyle, primaryButtonStyle,
} from './ui'

export default function PerkSettings({ onClose }: { onClose: () => void }) {
  const { settings, perks, canEdit, patchSettings, run, reload } = useLibrary()

  /** الأنواع كما هي الآن، ولكلٍّ اسمُه الأوّل ليُعرف ما تبدّل عند الحفظ */
  const start = useMemo(
    () => perkKindsOf(settings, perks).map((name) => ({ was: name, now: name })),
    [settings, perks],
  )
  const [rows, setRows] = useState(start)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const countOf = (kind: string) => perks.filter((p) => p.kind === kind).length

  function add() {
    const name = draft.trim()
    if (!name || rows.some((r) => r.now.trim() === name)) { setDraft(''); return }
    setRows([...rows, { was: '', now: name }])
    setDraft('')
  }

  const clean = rows.map((r) => r.now.trim()).filter(Boolean)
  const ready = clean.length > 0 && new Set(clean).size === clean.length

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    // إعادةُ التسمية أوّلًا ثم حفظُ القائمة: لو حُفظت القائمةُ أوّلًا ثم
    // أخفقت المزامنةُ لبقيت قيودٌ بنوعٍ رُفع من القائمة
    for (const r of rows) {
      const now = r.now.trim()
      if (r.was && now && now !== r.was) {
        await run(() => api.renamePerkKind(r.was, now))
      }
    }
    await patchSettings({ perk_kinds: clean })
    await reload()
    setSaving(false)
    onClose()
  }

  if (!canEdit) return null

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="perk-editor overlay-sheet" style={{ width: 'min(560px, 100%)' }}>
        <header className="perk-editor-head">
          <h2>أنواع القيد</h2>
          <CloseButton onClose={onClose} />
        </header>

        <div className="perk-editor-body thin-scroll" style={{ gridTemplateColumns: '1fr' }}>
          <p className="perk-hint" style={{ gridColumn: '1 / -1' }}>
            أبوابُ كنّاشك: زِدْ ما تحتاج، وعدِّل ما شئت من الأسماء — ويُزامَن
            التعديلُ على قيوده فلا يبقى قيدٌ بنوعٍ لا وجود له.
          </p>

          <div className="kinds-list">
            {rows.map((r, i) => {
              const n = r.was ? countOf(r.was) : 0
              return (
                <div key={i} className="kinds-row">
                  <input
                    value={r.now}
                    onChange={(e) => setRows(rows.map(
                      (x, j) => (j === i ? { ...x, now: e.target.value } : x),
                    ))}
                    style={inputStyle}
                    aria-label={`اسم النوع ${i + 1}`}
                  />
                  <span className="kinds-count">
                    {n > 0 ? countLabel(n, PERKS_COUNT) : 'لا قيد'}
                  </span>
                  <button
                    type="button"
                    className="kinds-drop"
                    disabled={n > 0}
                    title={n > 0
                      ? `لا يُحذف وعليه ${countLabel(n, PERKS_COUNT)} — عدِّل اسمَه، أو انقل قيودَه إلى نوعٍ آخر`
                      : 'احذف هذا النوع'}
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    aria-label="احذف هذا النوع"
                  >
                    <ClearIcon size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="kinds-row kinds-add">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="نوعٌ جديد — «سؤال»، «تخريج»…"
              style={inputStyle}
            />
            <button type="button" onClick={add} style={ghostButtonStyle} disabled={!draft.trim()}>
              أضِفْه
            </button>
          </div>

          {!ready && (
            <p className="perk-hint" style={{ color: 'var(--danger)' }}>
              {clean.length === 0
                ? 'لا بدّ من نوعٍ واحد على الأقلّ.'
                : 'لا يتكرّر اسمُ نوعٍ مرَّتين.'}
            </p>
          )}
        </div>

        <footer className="perk-editor-foot">
          <button type="button" onClick={onClose} className="perk-save" style={ghostButtonStyle}>
            إلغاء
          </button>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={() => void save()}
            style={primaryButtonStyle(ready && !saving)}
          >
            {saving ? 'يُحفَظ…' : 'حفظ'}
          </button>
        </footer>
      </div>
    </Overlay>
  )
}
