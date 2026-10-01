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
//
// ===========================================================================
// هيئتُها — على طراز الكنّاش (`kn-set-*`)
// ===========================================================================
//
// كانت على أصناف نموذج الفائدة القديم: تبويبٌ من رُقَعٍ، وصفوفٌ من حقولٍ
// متراصّة لا يُعرف أوّلُها من آخرها، والفرعُ والرئيسُ في هيئةٍ واحدة. فصارت:
//   • **عمودًا للأبواب** إلى جانب اللوح، لكلّ بابٍ أيقونتُه وعددُ ما فيه
//     وسطرٌ يشرحه — كعمود الترشيح في الكنّاش. وعلى الجوّال شريطًا.
//   • **وصدرًا لكلّ باب**: شرحُه، وحقلٌ يُرشِّح صفوفَه — الأعلامُ تكثر فلا
//     يُبلَغ آخرُها بالتمرير — وزرُّ الزيادة وزرُّ الاستعادة.
//   • **وكلُّ صفٍّ بطاقةٌ**: أيقونتُه على أرضٍ من لونها، فاسمُه بارزًا، فشرحُه
//     أو وفاتُه، فعددُ فوائده شارةً، فزرُّ الحذف. والتصنيفُ الرئيس لوحٌ تحته
//     فروعُه مُزاحةً بخيط.
//   • **وذيلًا يُخبر بحال النافذة**: أفيها ما لم يُحفظ — فلا يُغلقها صاحبُها
//     وهو يظنّ أنّه حفظ.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { Icon } from '../lib/icons'
import { useLibrary } from '../lib/library'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import { IconChoice } from './IconPicker'
import {
  DEFAULT_PERK_CATEGORIES, DEFAULT_PERK_KINDS, PERKS_COUNT, countLabel,
  perkCategoriesOf, perkKindsOf,
  type PerkCategory, type PerkFigure, type PerkKindDef,
} from '../lib/types'
import { ClearIcon, CloseButton, GearIcon, Overlay, SearchIcon } from './ui'

type Tab = 'kinds' | 'topics' | 'figures'

const TABS: { key: Tab; label: string; icon: string; sub: string }[] = [
  { key: 'kinds', label: 'الأنواع', icon: 'gem', sub: 'تحريرٌ، تعقُّبٌ، نقل…' },
  { key: 'topics', label: 'التصنيفات', icon: 'nasab', sub: 'أبوابُ العلم وفروعُها' },
  { key: 'figures', label: 'الأعلام', icon: 'person', sub: 'من يُذكر في الفوائد' },
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

/** صفُّ النوع والعَلَم: معهما مِسماكٌ محلّيّ كالتصنيف، فلا يُعرف الصفُّ الجديدُ بموضعه */
type KindRow = PerkKindDef & { uid: string }
type FigureRow = PerkFigure & { uid: string }

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

const withUid = <T,>(rows: T[]): (T & { uid: string })[] => rows.map((r) => ({ ...r, uid: uid() }))
const stripUid = <T extends { uid: string }>({ uid: _u, ...rest }: T) => rest

export default function PerkSettings({ onClose }: { onClose: () => void }) {
  const {
    perks, perkKinds, perkCategories, perkFigures, settings, canEdit, run, reload,
  } = useLibrary()

  const [tab, setTab] = useState<Tab>('kinds')
  const [saving, setSaving] = useState(false)
  /** ترشيحُ الصفوف بالاسم، لكلّ بابٍ ترشيحُه */
  const [filter, setFilter] = useState<Record<Tab, string>>({ kinds: '', topics: '', figures: '' })
  /** الصفُّ الذي زِيد الآن: يُركَّز حقلُ اسمه */
  const [fresh, setFresh] = useState('')
  /** أمُسَّت النافذة؟ فإن لم تُمسّ تبعت ما يصل من الخادم */
  const dirty = useRef(false)
  /** والحالُ نفسُه للعرض: الذيلُ يُخبر بما لم يُحفظ */
  const [touched, setTouched] = useState(false)

  // المبدئيّةُ تُعرض حتى تُحرَّر، فأوّلُ حفظٍ يُثبتها صفوفًا في الجدول
  const [kinds, setKindsState] = useState<KindRow[]>(
    () => withUid(perkKindsOf(perkKinds, perks, settings.perk_kinds_set)),
  )
  const [cats, setCatsState] = useState<CatRow[]>(
    () => toRows(perkCategoriesOf(perkCategories, settings.perk_categories_set)),
  )
  const [figures, setFiguresState] = useState<FigureRow[]>(() => withUid(perkFigures))

  const touch = () => { dirty.current = true; setTouched(true) }
  const setKinds = (next: KindRow[]) => { touch(); setKindsState(next) }
  const setCats = (next: CatRow[]) => { touch(); setCatsState(next) }
  const setFigures = (next: FigureRow[]) => { touch(); setFiguresState(next) }

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
    setKindsState(withUid(perkKindsOf(perkKinds, perks, settings.perk_kinds_set)))
    setCatsState(toRows(perkCategoriesOf(perkCategories, settings.perk_categories_set)))
    setFiguresState(withUid(perkFigures))
  }, [perkKinds, perkCategories, perkFigures, perks, settings])

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
    return { kinds: dup(kinds), topics: dup(cats), figures: dup(figures) }
  }, [kinds, cats, figures])

  const ready = !clash.kinds && !clash.topics && !clash.figures
  /** البابُ الذي فيه التكرار، ليُنقل إليه من التنبيه */
  const clashTab = (Object.keys(clash) as Tab[]).find((k) => clash[k])

  /**
   * ما نقص من القائمة المبدئيّة. **والإعادةُ زيادةٌ لا استبدال**: يُردّ
   * الناقصُ وحدَه ويبقى ما بناه صاحبُ المكتبة على حاله — فمن حذف نوعًا
   * واحدًا لا يُهدَم عليه عملُه ليستردَّه.
   */
  const missingKinds = useMemo(
    () => DEFAULT_PERK_KINDS.filter((d) => !kinds.some((k) => k.name.trim() === d.name)),
    [kinds],
  )
  const missingCats = useMemo(() => {
    const has = new Set(cats.map((c) => c.name.trim()))
    return DEFAULT_PERK_CATEGORIES.filter((d) => !has.has(d.name))
  }, [cats])

  function restoreKinds() {
    setKinds([...kinds, ...withUid(missingKinds.map((d) => ({ ...d })))])
  }

  function restoreCats() {
    const next = [...cats]
    // الرئيسُ أوّلًا ليجد الفرعُ مِسماكَ رئيسه، ثم الفروع
    const uidOfName = new Map(
      next.filter((c) => !c.parentUid).map((c) => [c.name.trim(), c.uid]),
    )
    for (const d of missingCats.filter((d) => !d.parent)) {
      const u = uid()
      next.push({ uid: u, id: '', name: d.name, icon: d.icon, parentUid: '' })
      uidOfName.set(d.name, u)
    }
    for (const d of missingCats.filter((d) => d.parent)) {
      next.push({
        uid: uid(), id: '', name: d.name, icon: d.icon,
        parentUid: uidOfName.get(d.parent) ?? '',
      })
    }
    setCats(next)
  }

  /** يزيد صفًّا ويُفرغ الترشيح — صفٌّ جديدٌ فارغٌ لا يطابق شيئًا فيختفي */
  function added(u: string) {
    setFresh(u)
    setFilter((f) => ({ ...f, [tab]: '' }))
  }
  function addKind() {
    const u = uid()
    setKinds([...kinds, { uid: u, id: '', name: '', icon: '', hint: '' }])
    added(u)
  }
  function addCat(parentUid = '') {
    const u = uid()
    setCats([...cats, { uid: u, id: '', name: '', icon: '', parentUid }])
    added(u)
  }
  function addFigure() {
    const u = uid()
    setFigures([...figures, { uid: u, id: '', name: '', death: '', note: '', icon: '' }])
    added(u)
  }

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

    const ok = await run(async () => {
      await api.savePerkKinds(kinds.filter((k) => k.name.trim()).map(stripUid))
      await api.savePerkCategories(flat)
      await api.savePerkFigures(figures.filter((f) => f.name.trim()).map(stripUid))
    })
    setSaving(false)
    // والنافذةُ لا تُغلق على إخفاق: ما حُرِّر فيها باقٍ ليُعاد حفظُه
    if (!ok) return
    await reload()
    onClose()
  }

  /** الإغلاقُ بلا حفظ يُستأذن فيه إن كان في النافذة ما حُرِّر */
  function requestClose() {
    if (dirty.current && !window.confirm('فيه تعديلاتٌ لم تُحفظ بعد. أتُغلق النافذة وتُهملها؟')) return
    onClose()
  }

  // ------------------------------------------------------------ الترشيح
  const needle = normalizeText(filter[tab].trim(), QUICK_OPTS)
  const hit = (name: string) => !needle || normalizeText(name, QUICK_OPTS).includes(needle)

  const mains = cats.filter((c) => !c.parentUid)
  const kidsOf = (u: string) => cats.filter((c) => c.parentUid === u)

  const shownKinds = kinds.filter((k) => hit(k.name) || k.uid === fresh)
  const shownFigures = figures.filter((f) => hit(f.name) || f.uid === fresh)
  // التصنيفُ يُعرض إن طابق هو أو طابق فرعٌ من فروعه، وتحته ما طابق من فروعه
  // — أو فروعُه كلُّها إن كان هو المطابق
  const shownTopics = mains
    .map((main) => {
      const kids = kidsOf(main.uid)
      if (hit(main.name) || main.uid === fresh) return { main, kids }
      const some = kids.filter((k) => hit(k.name) || k.uid === fresh)
      return some.length ? { main, kids: some } : null
    })
    .filter((x): x is { main: CatRow; kids: CatRow[] } => x !== null)

  if (!canEdit) return null

  const sizes: Record<Tab, number> = {
    kinds: kinds.length,
    topics: mains.length,
    figures: figures.length,
  }
  const current = TABS.find((t) => t.key === tab)!
  const shownCount = tab === 'kinds' ? shownKinds.length
    : tab === 'figures' ? shownFigures.length : shownTopics.length

  return (
    <Overlay onClose={requestClose} align="flex-start" label="إعدادات الفوائد">
      <div className="kn-editor kn-set overlay-sheet">
        <header className="kn-editor-head">
          <span className="kn-editor-mark"><GearIcon size={19} /></span>
          <div>
            <h2>إعدادات الفوائد</h2>
            <p className="kn-editor-sub">أبوابُ الكنّاش: أنواعُه، وتصنيفاتُه، وأعلامُه</p>
          </div>
          <CloseButton onClose={requestClose} />
        </header>

        <div className="kn-set-main">
          {/* عمودُ الأبواب: لكلٍّ أيقونتُه وعددُه وسطرٌ يشرحه */}
          <nav className="kn-set-nav" role="tablist" aria-label="أبواب الإعدادات">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? 'kn-set-tab on' : 'kn-set-tab'}
                onClick={() => setTab(t.key)}
              >
                <span className="kn-set-tab-icon"><Icon name={t.icon} size={20} /></span>
                <span className="kn-set-tab-text">
                  <b>{t.label}</b>
                  <small>{t.sub}</small>
                </span>
                <em className={clash[t.key] ? 'warn' : undefined}>
                  {clash[t.key] ? '!' : sizes[t.key]}
                </em>
              </button>
            ))}
          </nav>

          <div className="kn-set-pane thin-scroll">
            {/* الخبرُ بالمنع في صدر اللوح لا في ذيله: زرُّ الحفظ يُعطَّل، فلا
                يُترك القارئُ يبحث عن العِلّة في آخر لوحٍ يُمرَّر */}
            {!ready && clashTab && (
              <div className="kn-set-warn" role="alert">
                <Icon name="alert" size={18} />
                <span>
                  اسمٌ مكرَّر في {TABS.find((t) => t.key === clashTab)!.label}:
                  {' '}«{clash[clashTab]}». والأسماءُ هي التي تُكتب في الفوائد، فلا
                  يُفرَّق بين متشابهَين — غيِّرْ أحدَهما ليُحفظ.
                </span>
                {clashTab !== tab && (
                  <button type="button" className="kn-link-btn" onClick={() => setTab(clashTab)}>
                    اذهب إليه
                  </button>
                )}
              </div>
            )}

            <section className="kn-set-intro">
              <h3>{current.label}</h3>
              {tab === 'kinds' && (
                <p>
                  أنواعُ ما تُقيِّد: تحريرٌ وتعقُّبٌ ونقلٌ ونحوها. ولكلّ نوعٍ أيقونتُه
                  وشرحُه، والشرحُ يُعرض في النموذج فلا يُخلَط نوعٌ بنوع.
                </p>
              )}
              {tab === 'topics' && (
                <p>
                  أبوابُ العلم التي تُنسب إليها الفائدة، <strong>منفصلةٌ عن تصنيفات
                  المكتبة انفصالًا تامًّا</strong>: تلك تُصنَّف بها الكتبُ على الأرفف،
                  وهذه تُصنَّف بها الفوائد. وتحت كلِّ تصنيفٍ فروعُه — «التغافل» فردٌ
                  من أفراد «الأخلاق والآداب». وحذفُ التصنيف يحذف فروعَه معه.
                </p>
              )}
              {tab === 'figures' && (
                <p>
                  سجلُّ الأعلام: من يُذكر في الفوائد. ويُسجَّل العَلَمُ من نموذج
                  الفائدة أيضًا أوّلَ مرّةٍ يُكتب اسمُه، فيُختار من القائمة بعدُ.
                  ووفاتُه تُعرض في بطاقته من باب «الأعلام».
                </p>
              )}
              <p className="kn-set-safe">
                <Icon name="verify" size={14} />
                الحذفُ يرفع الاسمَ من فوائده عند الحفظ، ولا تُحذف فائدةٌ واحدة.
              </p>
            </section>

            <div className="kn-set-tools">
              <label className="kn-search kn-set-filter">
                <SearchIcon size={15} />
                <input
                  value={filter[tab]}
                  onChange={(e) => setFilter({ ...filter, [tab]: e.target.value })}
                  placeholder={`رشِّح ${current.label} بالاسم…`}
                  aria-label={`رشِّح ${current.label}`}
                />
                {filter[tab] && (
                  <button
                    type="button"
                    onClick={() => setFilter({ ...filter, [tab]: '' })}
                    aria-label="امسح الترشيح"
                  >
                    <ClearIcon size={13} />
                  </button>
                )}
              </label>
              {tab === 'kinds' && (
                <RestoreButton n={missingKinds.length} what="الأنواع" onRestore={restoreKinds} />
              )}
              {tab === 'topics' && (
                <RestoreButton n={missingCats.length} what="التصنيفات" onRestore={restoreCats} />
              )}
              <button
                type="button"
                className="kn-btn kn-btn-primary kn-btn-sm"
                onClick={() => (tab === 'kinds' ? addKind() : tab === 'topics' ? addCat() : addFigure())}
              >
                + {tab === 'kinds' ? 'نوعٌ جديد' : tab === 'topics' ? 'تصنيفٌ جديد' : 'عَلَمٌ جديد'}
              </button>
            </div>

            {/* ---------------------------------------------------- الأنواع */}
            {tab === 'kinds' && (
              <div className="kn-set-list">
                {shownKinds.map((row, i) => {
                  const n = row.id ? kindCount(row.name) : 0
                  const patch = (p: Partial<KindRow>) => setKinds(kinds.map(
                    (x) => (x.uid === row.uid ? { ...x, ...p } : x),
                  ))
                  return (
                    <SetRow
                      key={row.uid}
                      icon={row.icon}
                      onIcon={(icon) => patch({ icon })}
                      label={row.name || 'النوع'}
                      count={n}
                      isNew={!row.id}
                      dup={!!row.name.trim() && row.name.trim() === clash.kinds}
                      drop={{ what: 'النوع', onDrop: () => setKinds(kinds.filter((x) => x.uid !== row.uid)) }}
                    >
                      <input
                        className="kn-set-name"
                        value={row.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="اسمُ النوع"
                        aria-label={`اسم النوع ${i + 1}`}
                        autoFocus={row.uid === fresh}
                      />
                      <input
                        className="kn-set-note"
                        value={row.hint}
                        onChange={(e) => patch({ hint: e.target.value })}
                        placeholder="شرحُه — يُعرض في النموذج"
                        aria-label={`شرح النوع ${i + 1}`}
                      />
                    </SetRow>
                  )
                })}
              </div>
            )}

            {/* ------------------------------------------------- التصنيفات */}
            {tab === 'topics' && (
              <div className="kn-set-list">
                {shownTopics.map(({ main, kids }) => {
                  const n = main.id ? catCount(main.name) : 0
                  const allKids = kidsOf(main.uid)
                  const patch = (u: string, p: Partial<CatRow>) => setCats(cats.map(
                    (x) => (x.uid === u ? { ...x, ...p } : x),
                  ))
                  return (
                    <div key={main.uid} className="kn-set-topic">
                      <SetRow
                        icon={main.icon}
                        onIcon={(icon) => patch(main.uid, { icon })}
                        label={main.name || 'التصنيف'}
                        count={n}
                        isNew={!main.id}
                        dup={!!main.name.trim() && main.name.trim() === clash.topics}
                        drop={{
                          what: 'التصنيف',
                          kids: allKids.length,
                          onDrop: () => setCats(cats.filter(
                            (c) => c.uid !== main.uid && c.parentUid !== main.uid,
                          )),
                        }}
                      >
                        <input
                          className="kn-set-name"
                          value={main.name}
                          onChange={(e) => patch(main.uid, { name: e.target.value })}
                          placeholder="اسمُ التصنيف"
                          aria-label="اسم التصنيف"
                          autoFocus={main.uid === fresh}
                        />
                        <span className="kn-set-kids-count">
                          {allKids.length ? `${allKids.length} من الفروع` : 'بلا فروع'}
                        </span>
                      </SetRow>

                      {/* والفروعُ مُزاحةٌ تحت رئيسها بخيط: يُعرف أنها تحته لا
                          قسيمةٌ له */}
                      <div className="kn-set-kids">
                        {kids.map((kid) => {
                          const kn = kid.id ? catCount(kid.name) : 0
                          return (
                            <SetRow
                              key={kid.uid}
                              small
                              icon={kid.icon}
                              onIcon={(icon) => patch(kid.uid, { icon })}
                              label={kid.name || 'الفرع'}
                              count={kn}
                              isNew={!kid.id}
                              dup={!!kid.name.trim() && kid.name.trim() === clash.topics}
                              drop={{
                                what: 'الفرع',
                                onDrop: () => setCats(cats.filter((c) => c.uid !== kid.uid)),
                              }}
                            >
                              <input
                                className="kn-set-name"
                                value={kid.name}
                                onChange={(e) => patch(kid.uid, { name: e.target.value })}
                                placeholder="اسمُ الفرع"
                                aria-label="اسم الفرع"
                                autoFocus={kid.uid === fresh}
                              />
                            </SetRow>
                          )
                        })}
                        <button type="button" className="kn-set-add-kid" onClick={() => addCat(main.uid)}>
                          + فرعٌ تحت «{main.name || 'هذا التصنيف'}»
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* --------------------------------------------------- الأعلام */}
            {tab === 'figures' && (
              <div className="kn-set-list">
                {shownFigures.map((row, i) => {
                  const n = row.id ? figureCount(row.name) : 0
                  const patch = (p: Partial<FigureRow>) => setFigures(figures.map(
                    (x) => (x.uid === row.uid ? { ...x, ...p } : x),
                  ))
                  return (
                    <SetRow
                      key={row.uid}
                      // وللعَلَم أيقونتُه كما لكلّ نوعٍ وتصنيفٍ وكرّاسة، وفراغُها
                      // يُرسم شخصًا في شبكة الأعلام لا بياضًا
                      icon={row.icon}
                      onIcon={(icon) => patch({ icon })}
                      label={row.name || 'العَلَم'}
                      count={n}
                      isNew={!row.id}
                      dup={!!row.name.trim() && row.name.trim() === clash.figures}
                      drop={{ what: 'العَلَم', onDrop: () => setFigures(figures.filter((x) => x.uid !== row.uid)) }}
                    >
                      <input
                        className="kn-set-name"
                        value={row.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="اسمُ العَلَم"
                        aria-label={`اسم العَلَم ${i + 1}`}
                        autoFocus={row.uid === fresh}
                      />
                      <input
                        className="kn-set-note kn-set-death"
                        value={row.death}
                        onChange={(e) => patch({ death: e.target.value })}
                        placeholder="ت ٢٩١ هـ — إن عُرفت"
                        aria-label="وفاتُه"
                      />
                    </SetRow>
                  )
                })}
              </div>
            )}

            {shownCount === 0 && (
              <div className="kn-set-empty">
                <Icon name={filter[tab] ? 'magnifier' : current.icon} size={30} />
                <p>
                  {filter[tab]
                    ? `لا شيءَ في ${current.label} بهذا الاسم.`
                    : `لا شيءَ في ${current.label} بعد. أضِف أوّلَها من الزرّ أعلاه.`}
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="kn-editor-foot">
          <span className={touched ? 'kn-editor-status kn-set-dirty' : 'kn-editor-status'}>
            {!ready ? 'لا يُحفظ وفيه اسمٌ مكرَّر'
              : touched ? 'فيه تعديلاتٌ لم تُحفظ بعد' : 'لا تعديلَ بعد'}
          </span>
          <button type="button" className="kn-btn kn-btn-ghost" onClick={requestClose}>
            إلغاء
          </button>
          <button
            type="button"
            className="kn-btn kn-btn-primary"
            disabled={!ready || saving}
            onClick={() => void save()}
          >
            {saving ? 'يُحفَظ…' : 'حفظ'}
          </button>
        </footer>
      </div>
    </Overlay>
  )
}

/**
 * صفٌّ في الإعدادات: أيقونتُه، فحقولُه، فعددُ فوائده، فزرُّ حذفه. وهو واحدٌ
 * للأنواع والتصنيفات وفروعها والأعلام، فلا يفترق صفٌّ عن صفٍّ في هيئته.
 */
function SetRow(
  { icon, onIcon, label, count, isNew, dup, small, drop, children }: {
    icon: string
    onIcon: (icon: string) => void
    label: string
    count: number
    isNew: boolean
    /** اسمُه مكرَّر: يُعلَّم الصفُّ نفسُه، فلا يُبحث عنه في القائمة */
    dup: boolean
    small?: boolean
    drop: { what: string; kids?: number; onDrop: () => void }
    children: ReactNode
  },
) {
  const cls = ['kn-set-row', small && 'kn-set-row-sm', dup && 'dup'].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <IconChoice value={icon} onChange={onIcon} label={label} size={small ? 'sm' : 'md'} />
      <div className="kn-set-fields">{children}</div>
      <span className={count > 0 ? 'kn-set-count' : 'kn-set-count none'}>
        {isNew ? 'جديد' : count > 0 ? countLabel(count, PERKS_COUNT) : 'لا فائدة'}
      </span>
      <DropButton n={count} what={drop.what} kids={drop.kids} onDrop={drop.onDrop} />
    </div>
  )
}

/**
 * زرُّ إعادة القائمة المبدئيّة.
 *
 * والقائمةُ المبدئيّة تُعرض ما لم تُحرَّر، فإذا حُرِّرت لم تعد أبدًا — وذاك
 * هو الصواب: الفارغُ عن قصدٍ يبقى فارغًا. فبقي أن يكون لها بابٌ يُقصَد
 * قصدًا، وهذا هو.
 *
 * **وهي زيادةٌ لا استبدال**: يُردّ الناقصُ وحدَه ويبقى ما بناه صاحبُ المكتبة
 * على حاله. وما رُدّ لا يُحفظ حتى يُضغط «حفظ»، كسائر ما في النافذة — فله أن
 * يرى ما عاد قبل أن يُثبته.
 */
function RestoreButton(
  { n, what, onRestore }: { n: number; what: string; onRestore: () => void },
) {
  if (n === 0) {
    return <span className="kn-set-restored" title={`${what} المبدئيّةُ كلُّها موجودة`}>المبدئيّةُ كاملة</span>
  }
  return (
    <button
      type="button"
      className="kn-btn kn-btn-ghost kn-btn-sm"
      title={`يُردّ ما نقص من ${what} المبدئيّة (${n})، ولا يُحذف ما زدتَه`}
      onClick={onRestore}
    >
      أعِد المبدئيّةَ الناقصة ({n})
    </button>
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
      className="kn-set-drop"
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
