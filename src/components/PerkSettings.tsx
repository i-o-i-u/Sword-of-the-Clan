// إعدادات قسم الفوائد: أنواعُها، وتصنيفاتُها، وسجلُّ أعلامها.
//
// أبوابُ الكنّاش لصاحبه: يزيد ما يحتاج، ويُعدِّل الأسماء، **ويختار لكلّ نوعٍ
// وكلّ تصنيفٍ وكلّ فرعٍ أيقونتَه** من مكتبة الأيقونات. والأيقونةُ ههنا خبرٌ
// لا زينة: الفائدةُ تُعرف من بابها قبل أن يُقرأ اسمُه.
//
// وثلاثتُها قوائمُ تُحفظ دفعةً واحدة: ما زاد يُنشأ، وما نقص يُحذف **ويُرفع
// اسمُه من فوائده**، وما تبدّل اسمُه يُعدَّل ويُزامَن على فوائده في الخادم —
// كما يُزامَن اسمُ المؤلِّف على كتبه. وإغفالُ ذلك يترك فوائدَ بنوعٍ لا وجود
// له فلا تُصفَّى به.
//
// والصفُّ يحمل معرّفَه إن كان قائمًا، فيُعرف أنّ الاسمَ تبدّل ولم يُحذف صفٌّ
// ويُنشأ آخر — ولو عُرف بالاسم وحده لضاعت نسبةُ الفوائد بأوّل تصحيحٍ إملائيّ.
//
// **والفرعُ يتبع رئيسَه بمِسماكٍ محلّيّ لا باسمه** (`parentUid`): الاسمُ يُمحى
// حرفًا حرفًا وأنت تُصحِّحه، فلو كانت النسبةُ به لصارت فروعُ التصنيف تصنيفاتٍ
// مستقلّةً في أوّل حرفٍ يُمحى، ولم تعد إليه. وإنما يُكتب اسمُ الرئيس في الفرع
// عند الحفظ وحده.
//
// **وحالُ النافذة تُملأ من البيانات متى وصلت**: قد تُفتح قبل أن تصل، فتُبنى
// على المبدئيّ ثم يُحفظ فيُنشأ ما هو قائمٌ مرّةً ثانية. فما لم يُمسّ فيها
// يتبع ما جاء من الخادم، وما مُسّ لا يُمحى.
//
// وأمّا **الكرّاسات** فليست ههنا: لها بابُها من صفحة الفوائد، ومن صفحة كل
// كرّاسةٍ تُضاف الفوائدُ الداخلة فيها.

import { useEffect, useMemo, useRef, useState } from 'react'
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

/** مِسماكٌ محلّيّ لا يُحفظ: به يعرف الفرعُ رئيسَه ما دامت النافذة مفتوحة */
let seq = 0
const uid = () => `u${++seq}`

/** صفُّ التصنيف في النافذة: كصفّه في القاعدة، ونسبتُه بالمِسماك لا بالاسم */
interface CatRow {
  uid: string
  id: string
  name: string
  icon: string
  /** مِسماكُ رئيسه، وفارغُه: هو رئيسٌ بنفسه */
  parentUid: string
}

function toRows(cats: PerkCategory[]): CatRow[] {
  const mains = cats.filter((c) => !c.parent)
  const byName = new Map<string, string>()
  const rows: CatRow[] = mains.map((c) => {
    const u = uid()
    byName.set(c.name, u)
    return { uid: u, id: c.id, name: c.name, icon: c.icon, parentUid: '' }
  })
  for (const c of cats) {
    if (!c.parent) continue
    rows.push({
      uid: uid(),
      id: c.id,
      name: c.name,
      icon: c.icon,
      // فرعٌ لا رئيسَ له في القائمة يُعرض رئيسًا، فلا يسقط من النافذة
      parentUid: byName.get(c.parent) ?? '',
    })
  }
  return rows
}

export default function PerkSettings({ onClose }: { onClose: () => void }) {
  const {
    perks, perkKinds, perkCategories, perkFigures, canEdit, run, reload,
  } = useLibrary()

  const [tab, setTab] = useState<Tab>('kinds')
  const [saving, setSaving] = useState(false)
  /** أمُسَّت النافذة؟ فإن لم تُمسّ تبعت ما يصل من الخادم */
  const dirty = useRef(false)

  // المبدئيّةُ تُعرض حتى تُحرَّر، فأوّلُ حفظٍ يُثبتها صفوفًا في الجدول
  const [kinds, setKindsState] = useState<PerkKindDef[]>(() => perkKindsOf(perkKinds, perks))
  const [cats, setCatsState] = useState<CatRow[]>(() => toRows(perkCategoriesOf(perkCategories)))
  const [figures, setFiguresState] = useState<PerkFigure[]>(() => perkFigures)

  const setKinds = (next: PerkKindDef[]) => { dirty.current = true; setKindsState(next) }
  const setCats = (next: CatRow[]) => { dirty.current = true; setCatsState(next) }
  const setFigures = (next: PerkFigure[]) => { dirty.current = true; setFiguresState(next) }

  /**
   * النافذةُ قد تُفتح والبياناتُ في الطريق، فتُبنى حالُها على المبدئيّ. فمتى
   * وصلت أُعيد بناؤها منها — ما لم يكن صاحبُ المكتبة قد بدأ التحرير، فعملُه
   * أولى من تحديثٍ يمحوه.
   *
   * وإغفالُ هذا كان يُنشئ ما هو قائم مرّةً ثانية: الصفوفُ المبدئيّة بلا
   * معرّفات، فتُحفظ كأنها جديدة.
   */
  useEffect(() => {
    if (dirty.current) return
    setKindsState(perkKindsOf(perkKinds, perks))
    setCatsState(toRows(perkCategoriesOf(perkCategories)))
    setFiguresState(perkFigures)
  }, [perkKinds, perkCategories, perkFigures, perks])

  const kindCount = (name: string) => perks.filter((p) => p.kinds.includes(name)).length
  const catCount = (name: string) => perks.filter(
    (p) => p.categories.includes(name) || p.sub_categories.includes(name),
  ).length
  const figureCount = (name: string) => perks.filter((p) => p.people.includes(name)).length

  /**
   * الاسمُ المكرَّر يُمنع، ويُقال أيُّ اسمٍ هو: الأسماءُ هي التي تُكتب في
   * الفوائد، فاسمان متشابهان لا يُفرَّق بينهما بعدُ.
   */
  const clash = useMemo(() => {
    const dup = (list: { name: string }[]) => {
      const seen = new Set<string>()
      for (const r of list) {
        const n = r.name.trim()
        if (!n) continue
        if (seen.has(n)) return n
        seen.add(n)
      }
      return ''
    }
    return { kinds: dup(kinds), cats: dup(cats), figures: dup(figures) }
  }, [kinds, cats, figures])

  const ready = !clash.kinds && !clash.cats && !clash.figures

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    // اسمُ الرئيس يُكتب في فرعه ههنا: النسبةُ في النافذة بالمِسماك، وفي
    // القاعدة بالاسم
    const nameOf = new Map(cats.map((c) => [c.uid, c.name.trim()]))
    const flat: PerkCategory[] = cats
      .filter((c) => c.name.trim())
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        parent: c.parentUid ? (nameOf.get(c.parentUid) ?? '') : '',
        icon: c.icon,
      }))
      // فرعٌ مُحي اسمُ رئيسه لا يُحفظ فرعًا ليتيمٍ، بل يُرفع رئيسًا
      .map((c) => (c.parent ? c : { ...c, parent: '' }))

    await run(async () => {
      await api.savePerkKinds(kinds.filter((k) => k.name.trim()))
      await api.savePerkCategories(flat)
      await api.savePerkFigures(figures.filter((f) => f.name.trim()))
    })
    await reload()
    setSaving(false)
    onClose()
  }

  if (!canEdit) return null

  const mains = cats.filter((c) => !c.parentUid)

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

          {/* الخبرُ بالمنع في صدر النافذة لا في ذيلها: زرُّ الحفظ يُعطَّل،
              فلا يُترك القارئُ يبحث عن العِلّة في آخر لوحٍ يُمرَّر */}
          {!ready && (
            <p className="perk-warn">
              اسمٌ مكرَّر: «{clash.kinds || clash.cats || clash.figures}». والأسماءُ
              هي التي تُكتب في الفوائد، فلا يُفرَّق بين متشابهَين — غيِّرْ أحدَهما
              ليُحفظ.
            </p>
          )}

          {tab === 'kinds' && (
            <>
              <p className="perk-hint">
                أنواعُ ما تُقيِّد: تحريرٌ وتعقُّبٌ ونقلٌ ونحوها. ولكلّ نوعٍ
                أيقونتُه وشرحُه، والشرحُ يُعرض في النموذج فلا يُخلَط نوعٌ بنوع.
                وحذفُ النوع يرفع اسمَه من فوائده — <strong>ولا تُحذف فائدةٌ
                واحدة</strong>.
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
                «التغافل» فردٌ من أفراد «الأخلاق والآداب». وحذفُ التصنيف يحذف
                فروعَه معه، ويرفع اسمَه من فوائده — <strong>ولا تُحذف فائدةٌ
                واحدة</strong>.
              </p>

              <div className="topics-list">
                {mains.map((main) => {
                  const kids = cats.filter((c) => c.parentUid === main.uid)
                  const n = main.id ? catCount(main.name) : 0
                  return (
                    <div key={main.uid} className="topic-block">
                      <div className="kinds-row kinds-row-wide">
                        <IconChoice
                          value={main.icon}
                          label={main.name || 'التصنيف'}
                          onChange={(icon) => setCats(cats.map(
                            (x) => (x.uid === main.uid ? { ...x, icon } : x),
                          ))}
                        />
                        <input
                          value={main.name}
                          onChange={(e) => setCats(cats.map(
                            (x) => (x.uid === main.uid ? { ...x, name: e.target.value } : x),
                          ))}
                          placeholder="اسمُ التصنيف"
                          style={inputStyle}
                          aria-label="اسم التصنيف"
                        />
                        <span className="kinds-count">
                          {n > 0 ? countLabel(n, PERKS_COUNT) : 'لا فائدة'}
                        </span>
                        <DropButton
                          n={n}
                          what="التصنيف"
                          kids={kids.length}
                          onDrop={() => setCats(cats.filter(
                            (c) => c.uid !== main.uid && c.parentUid !== main.uid,
                          ))}
                        />
                      </div>

                      <div className="topic-kids">
                        {kids.map((kid) => {
                          const kn = kid.id ? catCount(kid.name) : 0
                          return (
                            <div key={kid.uid} className="kinds-row kinds-row-wide">
                              <IconChoice
                                value={kid.icon}
                                label={kid.name || 'الفرع'}
                                onChange={(icon) => setCats(cats.map(
                                  (x) => (x.uid === kid.uid ? { ...x, icon } : x),
                                ))}
                              />
                              <input
                                value={kid.name}
                                onChange={(e) => setCats(cats.map(
                                  (x) => (x.uid === kid.uid ? { ...x, name: e.target.value } : x),
                                ))}
                                placeholder="اسمُ الفرع"
                                style={inputStyle}
                                aria-label="اسم الفرع"
                              />
                              <span className="kinds-count">
                                {kn > 0 ? countLabel(kn, PERKS_COUNT) : 'لا فائدة'}
                              </span>
                              <DropButton
                                n={kn}
                                what="الفرع"
                                onDrop={() => setCats(cats.filter((c) => c.uid !== kid.uid))}
                              />
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          className="topic-add-kid"
                          onClick={() => setCats([
                            ...cats,
                            { uid: uid(), id: '', name: '', icon: '', parentUid: main.uid },
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
                onClick={() => setCats([
                  ...cats, { uid: uid(), id: '', name: '', icon: '', parentUid: '' },
                ])}
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
                وحذفُه يرفع اسمَه من فوائده — <strong>ولا تُحذف فائدةٌ واحدة</strong>.
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
 * الحذفُ ماضٍ وإن كانت عليه فوائد، **ويُرفع اسمُه منها في الخادم** — ولا
 * تُحذف فائدةٌ واحدة: التصنيفُ صفةٌ للفائدة لا وعاءٌ لها.
 *
 * وكان ممنوعًا وعليه فوائد، بحجّة أنّ الحذف لا يمحو الاسمَ من الفوائد
 * فتُعيده القوائمُ إلى الظهور. وتلك عِلّةٌ في المُحوِّل عولجت في موضعها، فلا
 * يُمنع صاحبُ الكنّاش من حذف بابٍ في كنّاشه من أجلها. وإنما يُقال له ما يقع
 * قبل أن يقع.
 */
function DropButton(
  { n, what, kids = 0, onDrop }: {
    n: number
    what: string
    /** فروعُه، إن كان تصنيفًا رئيسًا: تُحذف معه فيُذكر ذلك */
    kids?: number
    onDrop: () => void
  },
) {
  const tail = [
    n > 0 && `يُرفع اسمُه عند الحفظ من ${countLabel(n, PERKS_COUNT)}`,
    kids > 0 && `وتُحذف فروعُه (${kids})`,
  ].filter(Boolean).join('، ')

  return (
    <button
      type="button"
      className="kinds-drop"
      title={tail ? `احذف هذا ${what} — ${tail}، ولا تُحذف فائدةٌ واحدة` : `احذف هذا ${what}`}
      onClick={() => {
        if (!tail) { onDrop(); return }
        if (!window.confirm(`حذفُ هذا ${what}: ${tail}. ولا تُحذف الفوائدُ نفسُها. أتمضي؟`)) return
        onDrop()
      }}
      aria-label={`احذف هذا ${what}`}
    >
      <ClearIcon size={14} />
    </button>
  )
}
