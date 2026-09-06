// «الفوائد والمقتطفات»: كنّاشُ المكتبة. واسمُه في الترويسة «الفوائد»
// اختصارًا، والاسمُ التامّ في صدره.
//
// وهو بابٌ ذو أبواب، لا صفحةً واحدة تُسرَد فيها الفوائدُ تحت عناوين كتبها
// كما كان. فالفائدةُ لا تُطلب من جهةٍ واحدة: تُطلب من تصنيفها، ومن العَلَم
// الذي ذُكر فيها، ومن الكرّاسة التي جُمعت لها، ومن مصدرها الذي خرجت منه —
// ولكلِّ طالبٍ بابُه:
//
//   • الفوائد     — كلُّها مجموعةً، تُصفَّى وتُرتَّب وتُقرأ بثلاث طرائق.
//   • التصنيفات  — أبوابُ العلم التي تتوزّع عليها، ومعها فروعُها.
//   • الأعلام    — كلُّ عَلَمٍ ذُكر في فائدة، يجتمع به ما تفرَّق عنه.
//   • الكرّاسات  — مسائلُ تُفتح ثم يُجمع لها المتفرِّق، **ومن صفحة الكرّاسة
//     تُضاف الفوائدُ الداخلة فيها** لا من نموذج الفائدة.
//   • المصادر    — كلُّ ما أفاد: كتبُ الفهرس، وما قُرئ أو سُمع من خارجها.
//   • النفائس    — ما بلغ من الفوائد النجومَ الثلاث، وهي خلاصةُ الكنّاش.
//
// ولكلّ بابٍ موضعُه من الرابط (`#/perks/topics`) فيُشارَك ويُعاد إليه، **وما
// رُشِّح به كذلك** (`#/perks?person=…`): من ضغط عَلَمًا أو كرّاسةً فقد قصد
// موضعًا بعينه، فحقُّه أن يُشارَك. ولكلّ فائدةٍ صفحتُها (`#/perk/:id`)،
// ولكلّ كرّاسةٍ صفحتُها (`#/notebook/:id`).
//
// وما حجبه الخادم عن الزائر لا يصل هذه الصفحة أصلًا: فوائدُ الكتاب المخفيّ
// لا تُرسَل، ومفتاحُ «الفوائد والمقتطفات» في تبويب الزوار يُسقطها كلَّها.

import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { useLibrary } from '../lib/library'
import { hashFor, navigate } from '../lib/router'
import { Icon } from '../lib/icons'
import { QUICK_OPTS, normalizeText } from '../lib/search'
import {
  EMPTY_FILTER, PERK_SORTS, PICK_FIELDS, activeFilters, filterIsOn, filterPerks,
  isPickField,
  notebookTallies, perkDate, perkPeople, perkSources, perkTags, perkTopics,
  sortPerks, sourceTitle,
  type PerkFilter, type PerkSort, type PickField, type Tally,
} from '../lib/perks'
import {
  FIGURES_COUNT, GEMS_COUNT, PERKS_COUNT, SOURCES_COUNT, CATEGORIES_COUNT,
  countLabel, countParts, formatNumber, perkCategoriesOf, perkKindsOf,
  type CountForms, type Notebook, type Perk, type PerkKindDef,
} from '../lib/types'
import PerkCard from '../components/PerkCard'
import Prose from '../components/Prose'
import RichText from '../components/RichText'
import PerkEditor from '../components/PerkEditor'
import PerkSettings from '../components/PerkSettings'
import { IconChoice } from '../components/IconPicker'
import {
  BackButton, ClearIcon, EmptyState, GearIcon, GridIcon, HashIcon, OpenBookIcon,
  OwnerIcon, PerkIcon, QuoteIcon, ScrollIcon, SearchIcon, TableIcon, VerifyIcon,
  facetStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, viewToggleStyle,
} from '../components/ui'

/** أبوابُ الكنّاش. المفتاحُ موضعُه من الرابط، والصدرُ بلا مفتاح. */
const TABS = [
  { key: '', label: 'الفوائد', icon: ScrollIcon },
  { key: 'topics', label: 'التصنيفات', icon: GridIcon },
  { key: 'people', label: 'الأعلام', icon: OwnerIcon },
  { key: 'notebooks', label: 'الكرّاسات', icon: OpenBookIcon },
  { key: 'sources', label: 'المصادر', icon: QuoteIcon },
  { key: 'gems', label: 'النفائس', icon: VerifyIcon },
] as const

/** طرائقُ قراءتها: بطاقاتٌ مفصَّلة، أو فهرسٌ يُمسح بالعين، أو نصٌّ متّصل */
const VIEWS = [
  { key: 'cards', label: 'بطاقات', icon: GridIcon },
  { key: 'index', label: 'فهرس', icon: TableIcon },
  { key: 'reading', label: 'مطالعة متّصلة', icon: ScrollIcon },
] as const

type ViewKey = typeof VIEWS[number]['key']

export default function Perks(
  { tab = '', pick: picked }: { tab?: string; pick?: { field: string; value: string } },
) {
  const {
    perks, notebooks, perkKinds, perkCategories, perkFigures, bookById, settings,
    isOwner, canEdit,
  } = useLibrary()
  const canSee = isOwner || settings.visibility.perks

  const [filter, setFilter] = useState<PerkFilter>(EMPTY_FILTER)
  const [sort, setSort] = useState<PerkSort>('newest')
  const [view, setView] = useState<ViewKey>('cards')
  const [editing, setEditing] = useState<Perk | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)

  /** الأنواعُ والتصنيفاتُ كما حُرِّرت، وإلّا فالمبدأ */
  const kinds = useMemo(
    () => perkKindsOf(perkKinds, perks, settings.perk_kinds_set),
    [perkKinds, perks, settings.perk_kinds_set],
  )
  const cats = useMemo(
    () => perkCategoriesOf(perkCategories, settings.perk_categories_set),
    [perkCategories, settings.perk_categories_set],
  )

  /**
   * ينتقل إلى باب «الفوائد» ويُصفِّيه بما ضُغط عليه، من أيّ بابٍ كان: عَلَمًا في
   * «الأعلام»، أو تصنيفًا في «التصنيفات»، أو مصدرًا في «المصادر»، أو رُقعةً
   * على بطاقة فائدة.
   *
   * **والترشيحُ يُكتب في الرابط**، فيُشارَك ويُعاد إليه، ويرجع القارئُ إليه
   * بزرّ الرجوع كما يرجع إلى أيّ موضع. وكان حالًا في الذاكرة وحدها: يُنقَل
   * القارئُ إلى قائمةٍ لا يدلّ رابطُها عليها، فإن نسخه لم يُصب صاحبُه شيئًا.
   */
  function pick(field: PickField, value: string) {
    navigate({ name: 'perks', pick: { field, value } })
  }

  /** بابٌ يُفتح من التبويب: يُخلي الترشيحَ — البابُ نفسُه ترشيحٌ قائم */
  function openTab(key: string) {
    setFilter(EMPTY_FILTER)
    navigate(key ? { name: 'perks', tab: key } : { name: 'perks' })
  }

  /**
   * يُنظِّف الرابطَ ممّا رُفع من الترشيح: لا يدّعي بابًا قد أُغلق، ولا يُقيَّد
   * ذلك في تاريخ التصفُّح — فمن رفع شرطًا لم يخطُ خطوةً يرجع عنها. والحالُ
   * لا يُعاد بناؤها، فالإخلاءُ وقع في موضعه.
   */
  function forgetPick() {
    if (!picked) return
    window.history.replaceState(
      null, '', hashFor(tab ? { name: 'perks', tab } : { name: 'perks' }),
    )
  }

  /** يرفع شرطًا واحدًا، ويبقى ما سواه: رفعُ شرطٍ ليس رفعًا للعمل كلِّه */
  function dropFilter(field: keyof PerkFilter) {
    setFilter((prev) => ({ ...prev, [field]: field === 'minRating' ? 0 : '' }))
    if (picked?.field === field) forgetPick()
  }

  function clearFilter() {
    setFilter(EMPTY_FILTER)
    forgetPick()
  }

  /**
   * ما في الرابط هو الترشيحُ القائم. ولا يُمسّ ما سواه من حال القارئ —
   * بحثُه وترتيبُه ونفاستُه — إلا حين يجيء بترشيحٍ جديد: عندئذٍ يُبتدأ
   * الأمرُ من رأسه، فهو قاصدٌ بابًا آخر لا مُضيفٌ شرطًا.
   */
  useEffect(() => {
    if (picked && isPickField(picked.field)) {
      setFilter({ ...EMPTY_FILTER, [picked.field]: picked.value })
    } else {
      setFilter((prev) => ({ ...prev, ...Object.fromEntries(
        PICK_FIELDS.map((k) => [k, '']),
      ) }))
    }
  }, [picked?.field, picked?.value])

  const topics = useMemo(() => perkTopics(perks, cats), [perks, cats])
  // والأعلامُ من جدولها لا من الفوائد وحدها: فيها وفياتُهم وأيقوناتُهم،
  // ومنها يُعرض من سُجِّل ولم تُنسَب إليه فائدةٌ بعد
  const people = useMemo(() => perkPeople(perks, perkFigures), [perks, perkFigures])
  const books = useMemo(() => notebookTallies(notebooks, perks), [notebooks, perks])
  const tags = useMemo(() => perkTags(perks), [perks])
  const sources = useMemo(() => perkSources(perks, bookById), [perks, bookById])
  const gems = useMemo(() => perks.filter((p) => p.rating >= 3), [perks])

  const shown = useMemo(() => {
    const base = tab === 'gems' ? gems : perks
    return sortPerks(filterPerks(base, filter, bookById), sort, bookById)
  }, [perks, gems, tab, filter, sort, bookById])

  return (
    <main className="app-main perks-page">
      <BackButton label="العودة إلى المكتبة" onClick={() => navigate({ name: 'browse' })} />

      {/*
        ترويسةُ القسم: قسمٌ قائمٌ بنفسه له اسمُه وأبوابُه وأدواتُه، لا صفحةٌ
        في المكتبة. فترويستُه تحمل ما تحمله ترويسةُ قسم: التعريفَ به،
        وأعدادَه، وأبوابَه الستّة، وأدواتِ صاحبه — الفائدةَ الجديدة
        وإعداداتِ الأنواع والتصنيفات. **وكلُّ لوحِ عددٍ فيها بابُه**: هو
        عددُ ما فيه، فالضغطُ عليه يفتحه — وكان يعدّ ولا يدلّ.
      */}
      <header className="kunnash-head">
        <div className="kunnash-brand">
          <span className="kunnash-mark" aria-hidden="true"><PerkIcon size={26} /></span>
          <div className="kunnash-name">
            <h1>الفوائد والمقتطفات</h1>
            <p>
              كنّاشُ المكتبة: ما قُيِّد من كتبها ومن غيرها — تحريرًا لمسألة،
              أو تعقُّبًا على قول، أو نصًّا نُقل.
            </p>
          </div>

          {canEdit && (
            <div className="kunnash-tools">
              <button type="button" className="perks-new" onClick={() => setEditing(null)}>
                + فائدةٌ جديدة
              </button>
              <button
                type="button"
                className="kunnash-gear"
                onClick={() => setSettingsOpen(true)}
                title="إعدادات الفوائد — الأنواع والتصنيفات والأعلام"
                aria-label="إعدادات الفوائد"
              >
                <GearIcon size={18} />
              </button>
            </div>
          )}
        </div>

        {/* الأعدادُ لا تُعرض قبل أن يُقيَّد شيء — بطاقةٌ تقرأ صفرًا ليست
            خبرًا — وأمّا الأبوابُ فتبقى: التصنيفاتُ والكرّاساتُ تُحرَّر
            وتُفتح قبل أن تجتمع تحتها فائدة. */}
        {canSee && (
          <>
            {perks.length > 0 && (
            <div className="perks-tally">
              <Tile n={perks.length} forms={PERKS_COUNT} onOpen={() => openTab('')} />
              <Tile n={sources.length} forms={SOURCES_COUNT} onOpen={() => openTab('sources')} />
              <Tile
                n={topics.filter((t) => t.count > 0).length}
                forms={CATEGORIES_COUNT}
                onOpen={() => openTab('topics')}
              />
              <Tile
                n={people.filter((t) => t.count > 0).length}
                forms={FIGURES_COUNT}
                onOpen={() => openTab('people')}
              />
              <Tile n={gems.length} forms={GEMS_COUNT} onOpen={() => openTab('gems')} />
            </div>
            )}

            <nav className="perks-tabs" aria-label="أبواب الكنّاش">
              {TABS.map(({ key, label, icon: Icons }) => (
                <button
                  key={key || 'feed'}
                  type="button"
                  className={key === tab ? 'perks-tab perks-tab-on' : 'perks-tab'}
                  onClick={() => openTab(key)}
                >
                  <Icons size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}
      </header>

      {!canSee ? (
        <EmptyState title="الفوائد والمقتطفات غير معروضة" />
      ) : perks.length === 0 && (tab === '' || tab === 'gems' || tab === 'sources') ? (
        <EmptyState
          title="لم تُقيَّد فائدةٌ بعد"
          hint={canEdit
            ? 'ابدأ بواحدة: اضغط «فائدةٌ جديدة»، أو قيِّدها من صفحة كتابها.'
            : 'تُسجَّل الفائدةُ من صفحة الكتاب الذي استُخرجت منه.'}
        />
      ) : (
        <>
          {(tab === '' || tab === 'gems') && (
            <Feed
              perks={shown}
              total={tab === 'gems' ? gems.length : perks.length}
              gemsTab={tab === 'gems'}
              filter={filter}
              setFilter={setFilter}
              sort={sort}
              setSort={setSort}
              view={view}
              setView={setView}
              topics={topics}
              tags={tags}
              kinds={kinds}
              onEdit={canEdit ? setEditing : undefined}
              onPick={pick}
              onDrop={dropFilter}
              onClear={clearFilter}
              emptyTitle={tab === 'gems'
                ? 'لم تُوسَم فائدةٌ بالنجوم الثلاث بعد'
                : 'لا مطابق'}
            />
          )}

          {tab === 'topics' && (
            <TallyGrid
              rows={topics}
              hint="أبوابُ العلم التي تتوزّع عليها الفوائد، ومعها فروعُها. وهي قائمةٌ بنفسها لا صلةَ لها بتصنيفات الكتب، تُحرَّر من إعدادات القسم."
              onPick={(row) => pick('category', row.name)}
              onPickChild={(row) => pick('subCategory', row.name)}
              empty="لم يُحرَّر تصنيفٌ بعد."
            />
          )}

          {tab === 'people' && (
            <TallyGrid
              rows={people}
              hint="سجلُّ الأعلام: من ذُكر في فائدة، ومعه وفاتُه إن عُرفت. ويُسجَّل العَلَمُ من نموذج الفائدة أوّلَ مرّةٍ يُكتب اسمُه. واضغط الاسمَ يجتمع لك ما يتعلَّق به وحده."
              onPick={(row) => pick('person', row.name)}
              empty="لم يُسجَّل عَلَمٌ بعد."
            />
          )}

          {tab === 'notebooks' && <Notebooks rows={books} />}

          {/* والمصدرُ بابٌ كسائر الأبواب: كان صدرُ القسم يعدّ ما أفاد ولا
              يدلّ عليه، وكان في الترشيح حقلٌ للكتاب لا يضعه شيء */}
          {tab === 'sources' && (
            <TallyGrid
              rows={sources}
              hint="كلُّ ما أفاد: كتبُ الفهرس، وما قُرئ أو سُمع من خارجها — من شيخٍ في مجلسه، أو صفحةٍ على الشبكة، أو منشورٍ أو تسجيل. ولكلٍّ شارةُ جنسه."
              onPick={(row) => pick('source', row.name)}
              empty="لم يُقيَّد من مصدرٍ بعد."
            />
          )}
        </>
      )}

      {editing !== undefined && (
        <PerkEditor
          key={editing?.id ?? 'new'}
          perk={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {settingsOpen && <PerkSettings onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}

// ------------------------------------------------- بابُ الفوائد: مجموعةً
function Feed(
  { perks, total, gemsTab, filter, setFilter, sort, setSort, view, setView, topics,
    tags, kinds, onEdit, onPick, onDrop, onClear, emptyTitle }: {
    perks: Perk[]
    total: number
    /** بابُ النفائس: القائمةُ مُرشَّحةٌ به قبل الشريط، فلا يُعرض مُنتقي النفاسة */
    gemsTab: boolean
    filter: PerkFilter
    setFilter: (f: PerkFilter) => void
    sort: PerkSort
    setSort: (s: PerkSort) => void
    view: ViewKey
    setView: (v: ViewKey) => void
    topics: Tally[]
    tags: Tally[]
    kinds: PerkKindDef[]
    onEdit?: (perk: Perk) => void
    onPick: (field: PickField, value: string) => void
    /** يرفع شرطًا واحدًا من الترشيح، ويُنظِّف الرابطَ منه إن كان فيه */
    onDrop: (field: keyof PerkFilter) => void
    onClear: () => void
    emptyTitle: string
  },
) {
  const { bookById, notebooks } = useLibrary()
  const on = filterIsOn(filter)
  const chips = activeFilters(filter, notebooks)

  return (
    <>
      <div className="perks-bar">
        <div className="perks-search">
          <SearchIcon size={16} />
          <input
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            placeholder="ابحث في الفوائد: نصًّا، أو عنوانًا، أو عَلَمًا، أو اسم كتاب…"
            aria-label="ابحث في الفوائد"
          />
          {filter.query && (
            <button
              type="button"
              onClick={() => setFilter({ ...filter, query: '' })}
              aria-label="امسح البحث"
            >
              <ClearIcon size={14} />
            </button>
          )}
        </div>

        <div className="perks-views">
          {VIEWS.map(({ key, label, icon: Icons }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              title={label}
              aria-label={label}
              style={viewToggleStyle(view === key)}
            >
              <Icons size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="perks-facets">
        {/* النوع: كلُّ نوعٍ رُقعة، والمضغوطةُ تُرفع بضغطةٍ ثانية */}
        {kinds.map((k) => (
          <button
            key={k.name}
            type="button"
            onClick={() => setFilter({ ...filter, kind: filter.kind === k.name ? '' : k.name })}
            style={facetStyle(filter.kind === k.name)}
          >
            <Icon name={k.icon} size={13} plain={filter.kind === k.name} />
            {k.name}
          </button>
        ))}

        <span className="perks-facet-gap" />

        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value, subCategory: '' })}
          className="perks-select"
          aria-label="التصنيف"
        >
          <option value="">كلّ التصنيفات</option>
          {/* والبابُ الفارغ يُعرض في شبكة التصنيفات — «بابٌ فارغٌ خبر» —
              وأمّا ههنا فخيارٌ لا مطابقَ له، فلا يُعرض */}
          {topics.filter((t) => t.count > 0 || t.name === filter.category)
            .map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

        {/* والنفاسةُ لا تُسأل في باب النفائس: القائمةُ مُرشَّحةٌ بالنجوم الثلاث
            قبل الشريط، فخياراتُه الأربعة كلُّها بلا أثر */}
        {!gemsTab && (
          <select
            value={String(filter.minRating)}
            onChange={(e) => setFilter({ ...filter, minRating: Number(e.target.value) })}
            className="perks-select"
            aria-label="النفاسة"
          >
            <option value="0">كلُّ النفاسات</option>
            <option value="1">★ فما فوق</option>
            <option value="2">★★ فما فوق</option>
            <option value="3">★★★ النفائس</option>
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as PerkSort)}
          className="perks-select"
          aria-label="الترتيب"
        >
          {PERK_SORTS.map((s) => (
            <option key={s.key} value={s.key}>ترتيب: {s.label}</option>
          ))}
        </select>
      </div>

      {/* الوسومُ صفٌّ تحت المُصفِّيات: هي أسرعُ ما تُطلب به الفائدة */}
      {tags.length > 0 && (
        <div className="perks-tagline">
          {tags.slice(0, 18).map((t) => (
            <button
              key={t.name}
              type="button"
              className={filter.tag === t.name ? 'perk-tag perk-tag-on' : 'perk-tag'}
              // الرُّقعةُ ههنا تُبدَّل وحدَها ولا تمحو ما سواها: القارئُ قد
              // كتب بحثًا واختار تصنيفًا، فليس رفعُ وسمٍ رفعًا لعمله كلِّه
              onClick={() => setFilter({
                ...filter, tag: filter.tag === t.name ? '' : t.name,
              })}
            >
              <HashIcon size={10} />
              {t.name}
              <span className="perk-tag-count">{formatNumber(t.count)}</span>
            </button>
          ))}
        </div>
      )}

      {/*
        الترشيحُ القائم مقروءًا، شارةً لكلّ شرط.

        **وهذا ما كان ينقص الباب**: العَلَمُ والفرعُ والكرّاسةُ والمصدرُ
        تُرشَّح بها القائمةُ وليس في الشريط ما يُظهرها — لا رُقعةَ لها ولا
        مُنتقي — فيقف القارئُ على قائمةٍ نقصت لا يدري بأيّ شيءٍ نقصت. وكلُّ
        شارةٍ تُرفع وحدَها، فرفعُ شرطٍ ليس رفعًا لعمله كلِّه.
      */}
      {chips.length > 0 && (
        <div className="perks-active">
          <span className="perks-active-label">المعروضُ مُرشَّحٌ بـ</span>
          {chips.map((chip) => (
            <button
              key={`${chip.field}:${chip.value}`}
              type="button"
              className="perks-active-chip"
              onClick={() => onDrop(chip.field)}
              title={`ارفع هذا الشرط: ${chip.label}`}
            >
              <span className="perks-active-name">{chip.label}</span>
              <span className="perks-active-value">{chip.value}</span>
              <ClearIcon size={11} />
            </button>
          ))}
        </div>
      )}

      <div className="perks-count">
        {on && (
          <button type="button" className="perks-clear" onClick={onClear}>
            <ClearIcon size={12} />
            ارفع الترشيح كلَّه
          </button>
        )}
        <span>
          {countLabel(perks.length, PERKS_COUNT)}
          {on && perks.length !== total && ` من ${formatNumber(total)}`}
        </span>
      </div>

      {perks.length === 0 ? (
        <EmptyState title={emptyTitle} hint="جرِّب كلمةً أخرى، أو ارفع الترشيح." />
      ) : view === 'index' ? (
        <ol className="perk-index">
          {perks.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => navigate({ name: 'perk', id: p.id })}>
                <span className="perk-index-kind">{p.kinds[0] ?? ''}</span>
                <span className="perk-index-title">{p.title || p.text.slice(0, 70) + '…'}</span>
                <span className="perk-index-book">
                  {sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined)}
                </span>
                {p.rating > 0 && <span className="perk-stars">{'★'.repeat(p.rating)}</span>}
                <span className="perk-index-date">{perkDate(p)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : view === 'reading' ? (
        /*
          مطالعةٌ متّصلة: النصوصُ وحدها يتلو بعضُها بعضًا كصفحةِ كتاب، ولكلٍّ
          عزوُه تحته. لمن أراد أن يقرأ الكنّاش لا أن يبحث فيه.

          **والنصُّ ههنا منسَّقٌ بهوامشه** كما في البطاقة سواءً بسواء. وكان
          يُعرض مجرَّدًا (`Prose` على `p.text`)، فيقع أنّ الوجهَ الموضوعَ
          للقراءة هو أقلُّ الوجوه وفاءً للنصّ: يسقط منه التنسيقُ الذي من
          أجله بُني المُحرِّر، **وتسقط الهوامشُ بأسرها** — فمِسماكُ الهامش
          `<sup>` فارغٌ لا نصَّ فيه، رقمُه عدٌّ في ملف الأنماط، فلا يُبقي منه
          التجريدُ أثرًا ولا تُرسم نصوصُه تحته — فتُقرأ الفائدةُ ذاتُ الهوامش
          كأنّها بلا هامش ولا علامةَ على النقص.

          ويُعرض معه تعليقُ المُقيِّد: هو من الفائدة، وفصلُه عن النصّ إنما هو
          كي لا يُخلَط بكلام صاحبه لا كي يُطوى عن قارئها.
        */
        <div className="perk-reading">
          {perks.map((p) => (
            <section key={p.id}>
              {p.title && <h3>{p.title}</h3>}
              <RichText html={p.text_html} text={p.text} footnotes={p.footnotes} />
              {p.comment && (
                <div className="perk-comment">
                  <span className="perk-comment-tag">
                    <OwnerIcon size={11} />
                    تعليقي
                  </span>
                  <Prose text={p.comment} />
                </div>
              )}
              <footer>
                <button type="button" onClick={() => navigate({ name: 'perk', id: p.id })}>
                  {sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined) || 'الفائدة'}
                </button>
              </footer>
            </section>
          ))}
        </div>
      ) : (
        <div className="perk-list">
          {perks.map((p) => (
            <PerkCard
              key={p.id}
              perk={p}
              onEdit={onEdit}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------- التصنيفات والأعلام
/** شبكةُ أسماءٍ بأعدادها: بها تُعرض التصنيفاتُ والأعلامُ جميعًا */
function TallyGrid(
  { rows, hint, onPick, onPickChild, empty }: {
    rows: Tally[]
    hint: string
    onPick: (row: Tally) => void
    onPickChild?: (row: Tally) => void
    empty: string
  },
) {
  if (rows.length === 0) return <EmptyState title={empty} />

  return (
    <>
      <p className="perks-hint">{hint}</p>
      <div className="tally-grid">
        {rows.map((row) => (
          <div key={row.name} className="tally-card">
            <button type="button" className="tally-head" onClick={() => onPick(row)}>
              {row.icon && (
                <span className="tally-icon" aria-hidden="true">
                  <Icon name={row.icon} size={26} />
                </span>
              )}
              <span className="tally-text">
                <span className="tally-name">{row.name}</span>
                {/* خبرُه تحت اسمه: وفاةُ العَلَم، أو جنسُ المصدر. وهو ما لا
                    تحمله الفائدةُ نفسها وإنما يُقرأ من جدوله. */}
                {row.note && <span className="tally-note">{row.note}</span>}
              </span>
              <span className="tally-count">{countLabel(row.count, PERKS_COUNT)}</span>
            </button>

            {row.children && row.children.length > 0 && (
              <div className="tally-kids">
                {row.children.map((kid) => (
                  <button
                    key={kid.name}
                    type="button"
                    onClick={() => (onPickChild ?? onPick)(kid)}
                  >
                    {kid.icon && <Icon name={kid.icon} size={14} />}
                    {kid.name}
                    <span>{formatNumber(kid.count)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- الكرّاسات
/**
 * الكرّاسات: مسائلُ تُفتح ثم يُجمع لها المتفرِّق. وهي جدولٌ قائم لا تُشتقّ من
 * الفوائد، فتقوم الكرّاسةُ وهي بعدُ خالية — ومن صفحتها تُضاف الفوائدُ الداخلة
 * فيها.
 */
function Notebooks({ rows }: { rows: Tally[] }) {
  const { canEdit, run, reload } = useLibrary()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('notebook')
  const [adding, setAdding] = useState(false)

  async function add() {
    if (!name.trim()) return
    await run(() => api.insertNotebook(name.trim(), '', icon))
    await reload()
    setName('')
    setAdding(false)
  }

  return (
    <>
      <p className="perks-hint">
        مسائلُ يُجمع لها المتفرِّق من الفوائد فتصير بحثًا مصغَّرًا. تُفتح
        الكرّاسةُ ههنا، ثم تُضاف إليها الفوائدُ من صفحتها.
      </p>

      {rows.length === 0 && !canEdit && (
        <EmptyState title="لم تُفتح كرّاسةٌ بعد." />
      )}

      <div className="tally-grid">
        {rows.map((row) => (
          <div key={row.id} className="tally-card">
            <button
              type="button"
              className="tally-head"
              onClick={() => navigate({ name: 'notebook', id: row.id! })}
            >
              <span className="tally-icon" aria-hidden="true">
                <Icon name={row.icon || 'notebook'} size={26} />
              </span>
              <span className="tally-name">{row.name}</span>
              <span className="tally-count">
                {row.count > 0 ? countLabel(row.count, PERKS_COUNT) : 'خالية بعدُ'}
              </span>
            </button>
          </div>
        ))}

        {/* زرُّ الزائد في هيئة البطاقات لا زرًّا غريبًا عنها، كزرِّ الدار
            في صفحة دُور النشر */}
        {canEdit && !adding && (
          <button type="button" className="tally-card tally-add" onClick={() => setAdding(true)}>
            + كرّاسةٌ جديدة
          </button>
        )}
      </div>

      {canEdit && adding && (
        <div className="notebook-add">
          <IconChoice value={icon} onChange={setIcon} label="الكرّاسة" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add() } }}
            placeholder="مسألةٌ تُجمع لها الفوائد — «عقِبُ خالد بن الوليد»"
            style={inputStyle}
            aria-label="اسم الكرّاسة"
            autoFocus
          />
          <button type="button" onClick={() => setAdding(false)} style={ghostButtonStyle}>
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void add()}
            disabled={!name.trim()}
            style={primaryButtonStyle(!!name.trim())}
          >
            افتحها
          </button>
        </div>
      )}
    </>
  )
}

/**
 * لوحُ عددٍ مفرد في صدر الصفحة. وما كان صفرًا لا يُعرض — ليس خبرًا.
 *
 * **ولفظُه من `countParts` لا بقالبٍ نصّيّ**: كان كلُّ لوحٍ يلحم رقمَه باسمه
 * بيده على صيغةٍ واحدة — «فائدةً»، «عَلَمًا» — وتلك صيغةُ التمييز لا تصحّ
 * إلّا من أحدَ عشرَ إلى تسعةٍ وتسعين، فيُقرأ في المكتبة الناشئة «١ فائدةً»
 * و«٢ عَلَمًا». وهو اللحنُ الذي أقيمت له `countLabel` في هذه الواجهة كلِّها،
 * فلم يشذّ عنها إلّا هذا الموضع.
 *
 * **ولكلّ لوحٍ بابُه**: هو عددُ ما فيه، فالضغطُ عليه يفتحه. وكان يعدّ ولا
 * يدلّ.
 */
function Tile({ n, forms, onOpen }: { n: number; forms: CountForms; onOpen: () => void }) {
  if (n <= 0) return null
  const { value, label } = countParts(n, forms)
  return (
    <button type="button" className="perks-tile" onClick={onOpen}>
      {value && <span className="perks-tile-value">{value}</span>}
      <span className="perks-tile-label">{label}</span>
    </button>
  )
}

// ----------------------------------------------------- صفحة الفائدة الواحدة
/**
 * الفائدةُ وحدها في صفحتها: نصُّها تامًّا لا يُطوى، وعزوُها، وما اتّصل بها
 * من فوائد — ما كان في كرّاساتها، وما خرج من كتابها. **وههنا تُعلَّم نفاستُها**
 * — بالنجوم في صدر بطاقتها — لا من نموذجها.
 *
 * وتقبل بادئةَ المعرّف كما تقبله تامًّا، كصفحة الكتاب: الرابطُ المنسوخ
 * مختصَر.
 */
export function PerkPage({ perkId }: { perkId: string }) {
  const { perks, notebooks, bookById, settings, isOwner, canEdit } = useLibrary()
  const [editing, setEditing] = useState(false)

  const perk = useMemo(
    () => perks.find((p) => p.id === perkId) ?? perks.find((p) => p.id.startsWith(perkId)),
    [perks, perkId],
  )

  const kin = useMemo(() => {
    if (!perk) return { notebook: [] as Perk[], book: [] as Perk[] }
    return {
      notebook: perk.notebook_ids.length
        ? perks.filter(
          (p) => p.id !== perk.id && p.notebook_ids.some((n) => perk.notebook_ids.includes(n)),
        )
        : [],
      book: perk.book_id
        ? perks.filter((p) => p.id !== perk.id && p.book_id === perk.book_id)
        : [],
    }
  }, [perks, perk])

  if (!(isOwner || settings.visibility.perks) || !perk) {
    return (
      <main className="app-main perks-page">
        <BackButton label="العودة إلى الفوائد" onClick={() => navigate({ name: 'perks' })} />
        <EmptyState
          title="لم يُعثَر على هذه الفائدة"
          hint="قد تكون حُذفت، أو أنها غير ظاهرةٍ للزوار."
        />
      </main>
    )
  }

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const inNotebooks = notebooks.filter((n) => perk.notebook_ids.includes(n.id))

  return (
    <main className="app-main perks-page perk-single">
      <BackButton label="العودة إلى الفوائد" onClick={() => navigate({ name: 'perks' })} />

      <PerkCard perk={perk} full onEdit={canEdit ? () => setEditing(true) : undefined} />

      {kin.notebook.length > 0 && (
        <section className="perk-kin">
          <h2>
            {inNotebooks.length === 1
              ? `من كرّاسة «${inNotebooks[0].name}»`
              : 'من كرّاساتها'}
            <span>{countLabel(kin.notebook.length, PERKS_COUNT)} أخرى</span>
          </h2>
          <div className="perk-list">
            {kin.notebook.map((p) => <PerkCard key={p.id} perk={p} />)}
          </div>
        </section>
      )}

      {kin.book.length > 0 && book && (
        <section className="perk-kin">
          <h2>
            من «{book.title}»
            <span>{countLabel(kin.book.length, PERKS_COUNT)} أخرى</span>
          </h2>
          <div className="perk-list">
            {kin.book.map((p) => <PerkCard key={p.id} perk={p} hideSource />)}
          </div>
        </section>
      )}

      {editing && (
        <PerkEditor key={perk.id} perk={perk} onClose={() => setEditing(false)} />
      )}
    </main>
  )
}

// ----------------------------------------------------- صفحة الكرّاسة الواحدة
/**
 * الكرّاسةُ في صفحتها: اسمُها وأيقونتُها وما جُمع لها، **ومنها تُضاف الفوائدُ
 * الداخلة فيها**. والإضافةُ ههنا لا في نموذج الفائدة: الكرّاسةُ تقوم بعد أن
 * يجتمع لها شيء، فتُجمع إليها مما قُيِّد لا مما يُقيَّد.
 *
 * وهي عرضٌ حتى يُضغط القلم، كصفحتَي المؤلِّف والدار: لا يرى الفاهرسُ نموذجَ
 * إدخالٍ وهو إنما جاء ليقرأ.
 */
export function NotebookPage({ notebookId }: { notebookId: string }) {
  const {
    perks, notebooks, settings, isOwner, canEdit, run, reload,
  } = useLibrary()
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')

  const notebook = useMemo<Notebook | undefined>(
    () => notebooks.find((n) => n.id === notebookId)
      ?? notebooks.find((n) => n.id.startsWith(notebookId)),
    [notebooks, notebookId],
  )

  const inside = useMemo(
    () => (notebook ? perks.filter((p) => p.notebook_ids.includes(notebook.id)) : []),
    [perks, notebook],
  )
  /**
   * ما ليس فيها من الفوائد، يُبحث فيه بمعيار البحث في المكتبة نفسه — بلا
   * تشكيلٍ ولا تفريقٍ بين الهمزات — لا بمطابقة الحرف كما كان.
   */
  const outside = useMemo(() => {
    if (!notebook) return []
    const needle = normalizeText(query.trim(), QUICK_OPTS)
    return perks
      .filter((p) => !p.notebook_ids.includes(notebook.id))
      .filter((p) => !needle
        || normalizeText(`${p.title} ${p.text}`, QUICK_OPTS).includes(needle))
      .slice(0, 40)
  }, [perks, notebook, query])

  if (!(isOwner || settings.visibility.perks) || !notebook) {
    return (
      <main className="app-main perks-page">
        <BackButton
          label="العودة إلى الكرّاسات"
          onClick={() => navigate({ name: 'perks', tab: 'notebooks' })}
        />
        <EmptyState title="لم يُعثَر على هذه الكرّاسة" />
      </main>
    )
  }

  const setMembership = async (perk: Perk, inIt: boolean) => {
    const next = inIt
      ? [...perk.notebook_ids, notebook.id]
      : perk.notebook_ids.filter((n) => n !== notebook.id)
    await run(() => api.setPerkNotebooks(perk.id, next))
    await reload()
  }

  return (
    <main className="app-main perks-page">
      <BackButton
        label="العودة إلى الكرّاسات"
        onClick={() => navigate({ name: 'perks', tab: 'notebooks' })}
      />

      <header className="kunnash-head">
        <div className="kunnash-brand">
          <span className="kunnash-mark" aria-hidden="true">
            <Icon name={notebook.icon || 'notebook'} size={26} />
          </span>
          <div className="kunnash-name">
            {editing ? (
              <div className="notebook-add">
                <IconChoice
                  value={notebook.icon}
                  label={notebook.name}
                  onChange={(icon) => void run(async () => {
                    await api.updateNotebook(notebook.id, { icon })
                    await reload()
                  })}
                />
                <input
                  defaultValue={notebook.name}
                  onBlur={(e) => void run(async () => {
                    const name = e.target.value.trim()
                    if (name && name !== notebook.name) {
                      await api.updateNotebook(notebook.id, { name })
                      await reload()
                    }
                  })}
                  style={inputStyle}
                  aria-label="اسم الكرّاسة"
                />
                <button type="button" onClick={() => setEditing(false)} style={ghostButtonStyle}>
                  تمّ
                </button>
              </div>
            ) : (
              <>
                <h1>{notebook.name}</h1>
                <p>
                  {inside.length > 0
                    ? `جُمع فيها ${countLabel(inside.length, PERKS_COUNT)}.`
                    : 'كرّاسةٌ خالية بعدُ. أضِفْ إليها ما يخصُّ مسألتَها من الفوائد.'}
                </p>
              </>
            )}
          </div>

          {canEdit && !editing && (
            <div className="kunnash-tools">
              <button type="button" className="perks-new" onClick={() => setPicking((v) => !v)}>
                {picking ? 'أغلِق الاختيار' : '+ أضِفْ فوائدَ إليها'}
              </button>
              <button
                type="button"
                className="kunnash-gear"
                onClick={() => setEditing(true)}
                title="تعديل اسم الكرّاسة وأيقونتها"
                aria-label="تعديل الكرّاسة"
              >
                <GearIcon size={18} />
              </button>
              <button
                type="button"
                className="kunnash-gear"
                onClick={() => {
                  // الحذفُ لا رجعةَ فيه، فيُستأذَن — ويُقال ما يقع بفوائدها
                  if (!window.confirm(
                    `حذفُ كرّاسة «${notebook.name}»؟ تخرج منها فوائدُها ولا تُحذف.`,
                  )) return
                  void run(async () => {
                    await api.deleteNotebook(notebook.id)
                    await reload()
                    navigate({ name: 'perks', tab: 'notebooks' })
                  })
                }}
                title="حذف الكرّاسة — ولا تُحذف فوائدُها، وإنما تخرج منها"
                aria-label="حذف الكرّاسة"
              >
                <ClearIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* لوحُ الاختيار: الفوائدُ التي ليست فيها، تُضاف بضغطة */}
      {canEdit && picking && (
        <div className="notebook-picker">
          <div className="perks-search">
            <SearchIcon size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الفوائد لتُضيفها…"
              aria-label="ابحث في الفوائد"
            />
          </div>
          <ul>
            {outside.map((p) => (
              <li key={p.id}>
                <span>{p.title || p.text.slice(0, 80) + '…'}</span>
                <button type="button" onClick={() => void setMembership(p, true)}>
                  أضِفْها
                </button>
              </li>
            ))}
            {outside.length === 0 && <li className="perk-hint">لا فائدةَ خارجها.</li>}
          </ul>
        </div>
      )}

      {inside.length === 0 ? (
        <EmptyState title="لم يُجمع فيها شيءٌ بعد" />
      ) : (
        <div className="perk-list">
          {inside.map((p) => (
            <div key={p.id} className="notebook-item">
              <PerkCard perk={p} />
              {canEdit && (
                <button
                  type="button"
                  className="notebook-drop"
                  onClick={() => void setMembership(p, false)}
                  title="أخرِجْها من هذه الكرّاسة — ولا تُحذف الفائدة"
                >
                  <ClearIcon size={12} />
                  أخرِجْها من الكرّاسة
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
