// إعدادات قسم الفوائد: أنواعُها، وتصنيفاتُها، وسجلُّ أعلامها.
//
// أبوابُ الكنّاش لصاحبه: يزيد ما يحتاج، ويُعدِّل الأسماء، **ويختار لكلّ نوعٍ
// وكلّ تصنيفٍ وكلّ فرعٍ أيقونتَه** من مكتبة الأيقونات. والأيقونةُ ههنا خبرٌ
// لا زينة: الفائدةُ تُعرف من بابها قبل أن يُقرأ اسمُه.
//
// وثلاثتُها قوائمُ تُحفظ دفعةً واحدة: ما زاد يُنشأ، وما نقص يُحذف، وما تبدّل
// اسمُه **يُزامَن على ما نُسب إليه من فوائد** في الخادم — كما يُزامَن اسمُ
// المؤلِّف على كتبه. وإغفالُ ذلك يترك فوائدَ بنوعٍ لا وجود له فلا تُصفَّى به.
//
// والصفُّ يحمل معرّفَه إن كان قائمًا، فيُعرف أنّ الاسمَ تبدّل ولم يُحذف صفٌّ
// ويُنشأ آخر — ولو عُرف بالاسم وحده لضاعت نسبةُ الفوائد بأوّل تصحيحٍ إملائيّ.
//
// وأمّا **الكرّاسات** فليست ههنا: لها بابُها من صفحة الفوائد، ومن صفحة كل
// كرّاسةٍ تُضاف الفوائدُ الداخلة فيها.

import { useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { IconChoice } from './IconPicker'
import {
  PERKS_COUNT, countLabel, perkCategoriesOf, perkKindsOf,
  type PerkCategory, type PerkFigure, type PerkKindDef,
} from '../lib/types'
import {
  ClearIcon, CloseButton, Overlay, ghostButtonStyle, inputStyle, primaryButtonStyle,
  tabStyle,
} from './ui'

type Tab = 'kinds' | 'topics' | 'figures'

const TABS: { key: Tab; label: string }[] = [
  { key: 'kinds', label: 'الأنواع' },
  { key: 'topics', label: 'التصنيفات' },
  { key: 'figures', label: 'الأعلام' },
]

export default function PerkSettings({ onClose }: { onClose: () => void }) {
  const {
    perks, perkKinds, perkCategories, perkFigures, canEdit, run, reload,
  } = useLibrary()

  const [tab, setTab] = useState<Tab>('kinds')
  const [saving, setSaving] = useState(false)

  // المبدئيّةُ تُعرض حتى تُحرَّر، فأوّلُ حفظٍ يُثبتها صفوفًا في الجدول
  const [kinds, setKinds] = useState<PerkKindDef[]>(
    () => perkKindsOf(perkKinds, perks),
  )
  const [cats, setCats] = useState<PerkCategory[]>(
    () => perkCategoriesOf(perkCategories),
  )
  const [figures, setFigures] = useState<PerkFigure[]>(() => perkFigures)

  const kindCount = (name: string) => perks.filter((p) => p.kinds.includes(name)).length
  const catCount = (name: string) => perks.filter(
    (p) => p.categories.includes(name) || p.sub_categories.includes(name),
  ).length
  const figureCount = (name: string) => perks.filter((p) => p.people.includes(name)).length

  const clean = (list: { name: string }[]) => list.map((r) => r.name.trim()).filter(Boolean)
  const ready = useMemo(() => {
    const names = clean(kinds)
    const catNames = clean(cats)
    return new Set(names).size === names.length
      && new Set(catNames).size === catNames.length
  }, [kinds, cats])

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    await run(async () => {
      await api.savePerkKinds(kinds.filter((k) => k.name.trim()))
      await api.savePerkCategories(cats.filter((c) => c.name.trim()))
      await api.savePerkFigures(figures.filter((f) => f.name.trim()))
    })
    await reload()
    setSaving(false)
    onClose()
  }

  if (!canEdit) return null

  const mains = cats.filter((c) => !c.parent)

  return (
    <Overlay onClose={onClose} align="flex-start">
      <div className="perk-editor overlay-sheet" style={{ width: 'min(720px, 100%)' }}>
        <header className="perk-editor-head">
          <h2>إعدادات الفوائد</h2>
          <CloseButton onClose={onClose} />
        </header>

        <div className="perk-editor-body thin-scroll" style={{ gridTemplateColumns: '1fr' }}>
          <div className="perk-settings-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={tabStyle(tab === t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'kinds' && (
            <>
              <p className="perk-hint">
                أنواعُ ما تُقيِّد: تحريرٌ وتعقُّبٌ ونقلٌ ونحوها. ولكلّ نوعٍ
                أيقونتُه وشرحُه، والشرحُ يُعرض في النموذج فلا يُخلَط نوعٌ بنوع.
              </p>

              <div className="kinds-list">
                {kinds.map((row, i) => {
                  const n = row.id ? kindCount(row.name) : 0
                  return (
                    <div key={row.id || `new-${i}`} className="kinds-row kinds-row-wide">
                      <IconChoice
                        value={row.icon}
                        label={row.name || 'النوع'}
                        onChange={(icon) => setKinds(kinds.map(
                          (x, j) => (j === i ? { ...x, icon } : x),
                        ))}
                      />
                      <input
                        value={row.name}
                        onChange={(e) => setKinds(kinds.map(
                          (x, j) => (j === i ? { ...x, name: e.target.value } : x),
                        ))}
                        style={inputStyle}
                        aria-label={`اسم النوع ${i + 1}`}
                      />
                      <input
                        value={row.hint}
                        onChange={(e) => setKinds(kinds.map(
                          (x, j) => (j === i ? { ...x, hint: e.target.value } : x),
                        ))}
                        placeholder="شرحُه — يُعرض في النموذج"
                        style={inputStyle}
                        aria-label={`شرح النوع ${i + 1}`}
                      />
                      <span className="kinds-count">
                        {n > 0 ? countLabel(n, PERKS_COUNT) : 'لا فائدة'}
                      </span>
                      <DropButton
                        n={n}
                        what="النوع"
                        onDrop={() => setKinds(kinds.filter((_, j) => j !== i))}
                      />
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                style={ghostButtonStyle}
                onClick={() => setKinds([...kinds, { id: '', name: '', icon: '', hint: '' }])}
              >
                + نوعٌ جديد
              </button>
            </>
          )}

          {tab === 'topics' && (
            <>
              <p className="perk-hint">
                أبوابُ العلم التي تُنسب إليها الفائدة. <strong>وهي منفصلةٌ عن
                تصنيفات المكتبة انفصالًا تامًّا</strong>: تلك تُصنَّف بها الكتبُ
                على الأرفف، وهذه تُصنَّف بها الفوائد. وتحت كلِّ تصنيفٍ فروعُه —
                «التغافل» فردٌ من أفراد «الأخلاق والآداب».
              </p>

              <div className="topics-list">
                {mains.map((main) => {
                  const mainIndex = cats.indexOf(main)
                  const kids = cats.filter((c) => c.parent === main.name)
                  return (
                    <div key={main.id || `new-${mainIndex}`} className="topic-block">
                      <div className="kinds-row kinds-row-wide">
                        <IconChoice
                          value={main.icon}
                          label={main.name || 'التصنيف'}
                          onChange={(icon) => setCats(cats.map(
                            (x, j) => (j === mainIndex ? { ...x, icon } : x),
                          ))}
                        />
                        <input
                          value={main.name}
                          onChange={(e) => {
                            const name = e.target.value
                            // واسمُ الرئيس مكتوبٌ في فروعه، فيُنقل إليها ههنا
                            // كما يُنقل في الخادم — وإلّا رأى صاحبُ المكتبة
                            // فروعًا تسقط من تحت التصنيف وهو يكتب اسمَه
                            setCats(cats.map((x, j) => {
                              if (j === mainIndex) return { ...x, name }
                              if (x.parent === main.name) return { ...x, parent: name }
                              return x
                            }))
                          }}
                          style={inputStyle}
                          aria-label="اسم التصنيف"
                        />
                        <span className="kinds-count">
                          {catCount(main.name) > 0
                            ? countLabel(catCount(main.name), PERKS_COUNT)
                            : 'لا فائدة'}
                        </span>
                        <DropButton
                          n={main.id ? catCount(main.name) : 0}
                          what="التصنيف"
                          onDrop={() => setCats(cats.filter(
                            (c) => c !== main && c.parent !== main.name,
                          ))}
                        />
                      </div>

                      <div className="topic-kids">
                        {kids.map((kid) => {
                          const kidIndex = cats.indexOf(kid)
                          const n = kid.id ? catCount(kid.name) : 0
                          return (
                            <div key={kid.id || `new-${kidIndex}`} className="kinds-row kinds-row-wide">
                              <IconChoice
                                value={kid.icon}
                                label={kid.name || 'الفرع'}
                                onChange={(icon) => setCats(cats.map(
                                  (x, j) => (j === kidIndex ? { ...x, icon } : x),
                                ))}
                              />
                              <input
                                value={kid.name}
                                onChange={(e) => setCats(cats.map(
                                  (x, j) => (j === kidIndex ? { ...x, name: e.target.value } : x),
                                ))}
                                style={inputStyle}
                                aria-label="اسم الفرع"
                              />
                              <span className="kinds-count">
                                {n > 0 ? countLabel(n, PERKS_COUNT) : 'لا فائدة'}
                              </span>
                              <DropButton
                                n={n}
                                what="الفرع"
                                onDrop={() => setCats(cats.filter((_, j) => j !== kidIndex))}
                              />
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          className="topic-add-kid"
                          onClick={() => setCats([
                            ...cats,
                            { id: '', name: '', parent: main.name, icon: '' },
                          ])}
                        >
                          + فرعٌ تحت «{main.name || 'هذا التصنيف'}»
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                style={ghostButtonStyle}
                onClick={() => setCats([...cats, { id: '', name: '', parent: '', icon: '' }])}
              >
                + تصنيفٌ جديد
              </button>
            </>
          )}

          {tab === 'figures' && (
            <>
              <p className="perk-hint">
                سجلُّ الأعلام: من يُذكر في الفوائد. ويُسجَّل العَلَمُ من نموذج
                الفائدة أيضًا أوّلَ مرّةٍ يُكتب اسمُه، فيُختار من القائمة بعدُ.
              </p>

              <div className="kinds-list">
                {figures.map((row, i) => {
                  const n = row.id ? figureCount(row.name) : 0
                  return (
                    <div key={row.id || `new-${i}`} className="kinds-row kinds-row-wide">
                      <input
                        value={row.name}
                        onChange={(e) => setFigures(figures.map(
                          (x, j) => (j === i ? { ...x, name: e.target.value } : x),
                        ))}
                        placeholder="اسمُ العَلَم"
                        style={inputStyle}
                        aria-label={`اسم العَلَم ${i + 1}`}
                      />
                      <input
                        value={row.death}
                        onChange={(e) => setFigures(figures.map(
                          (x, j) => (j === i ? { ...x, death: e.target.value } : x),
                        ))}
                        placeholder="ت ٢٩١ هـ — إن عُرفت"
                        style={inputStyle}
                        aria-label="وفاتُه"
                      />
                      <span className="kinds-count">
                        {n > 0 ? countLabel(n, PERKS_COUNT) : 'لا فائدة'}
                      </span>
                      <DropButton
                        n={n}
                        what="العَلَم"
                        onDrop={() => setFigures(figures.filter((_, j) => j !== i))}
                      />
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                style={ghostButtonStyle}
                onClick={() => setFigures([
                  ...figures, { id: '', name: '', death: '', note: '' },
                ])}
              >
                + عَلَمٌ جديد
              </button>
            </>
          )}

          {!ready && (
            <p className="perk-hint" style={{ color: 'var(--danger)' }}>
              لا يتكرّر اسمٌ مرَّتين في القائمة الواحدة.
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

/**
 * ما عليه فوائدُ لا يُحذف: حذفُه لا يمحوها — تُعيدها القوائمُ إلى الظهور كي
 * لا تسقط فائدةٌ من العرض — فيبقى الاسمُ ويظهر أنّ الحذف لم يقع. فيُقال ذلك
 * صراحةً، ويُعرض عددُ فوائده.
 */
function DropButton({ n, what, onDrop }: { n: number; what: string; onDrop: () => void }) {
  return (
    <button
      type="button"
      className="kinds-drop"
      disabled={n > 0}
      title={n > 0
        ? `لا يُحذف وعليه ${countLabel(n, PERKS_COUNT)} — عدِّل اسمَه، أو انقل فوائدَه إلى غيره`
        : `احذف هذا ${what}`}
      onClick={onDrop}
      aria-label={`احذف هذا ${what}`}
    >
      <ClearIcon size={14} />
    </button>
  )
}
