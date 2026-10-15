// «الفوائد والمقتطفات»: كنّاشُ المكتبة. واسمُه في الترويسة «الفوائد»
// اختصارًا، والاسمُ التامّ في صدره.
//
// أُعيد بناؤه من أصله على ثلاثة أصول:
//
//  ١. **الصدرُ مدخلٌ لا لافتة**: فيه البحثُ نفسُه — أوّلُ ما يُطلب به في
//     الكنّاش — وأعدادُه أبوابٌ تُفتح، وقرعةٌ تفتح فائدةً لم تخطر للقارئ،
//     وأدواتُ صاحب المكتبة.
//  ٢. **الترشيحُ عمودٌ إلى جانب القائمة لا صفوفٌ فوقها**: كانت رُقَعُ الأنواع
//     ومنتقياتُ التصنيف والنفاسة والترتيب وسطرُ الوسوم صفوفًا تتراكم فوق
//     الفوائد، فلا تُرى فائدةٌ قبل أربعة أسطرٍ من الأدوات. فصارت عمودًا
//     لاصقًا على الحاسوب، ودُرجًا يُفتح على الجوّال — **ولكلّ بابٍ فيه عددُ
//     ما يبقى لو اختير** على الترشيح القائم، فيُعرف قبل الضغط أيقود إلى شيء.
//  ٣. **القائمةُ تُرسم على دفعات**، وحالُ القارئ — ترشيحُه وبحثُه وترتيبُه
//     وطريقةُ عرضه — تبقى إذا فتح فائدةً ورجع (`useViewState`).
//
// والأبوابُ الستّة على حالها: الفوائد، والتصنيفات، والأعلام، والكرّاسات،
// والمصادر، والنفائس. ولكلّ بابٍ موضعُه من الرابط (`#/perks/topics`)، **وما
// رُشِّح به كذلك** (`#/perks?person=…`): من ضغط عَلَمًا أو كرّاسةً فقد قصد
// موضعًا بعينه، فحقُّه أن يُشارَك. ولكلّ فائدةٍ صفحتُها (`#/perk/:id`)،
// ولكلّ كرّاسةٍ صفحتُها (`#/notebook/:id`).
//
// وما حجبه الخادم عن الزائر لا يصل هذه الصفحة أصلًا: فوائدُ الكتاب المخفيّ
// لا تُرسَل، ومفتاحُ «الفوائد والمقتطفات» في تبويب الزوار يُسقطها كلَّها.
//
// ومما زِيد بعدُ:
//   • **ما بُحث به يُظلَّل** في البطاقات والفهرس والمطالعة.
//   • **المفاتيح**: «/» للبحث، وj وk للتنقّل بين الفوائد، وo لفتح المُضاءة.
//   • **التعديلُ الجماعيّ** لصاحب المكتبة: يُحدِّد فوائدَ ثم يضيف إليها صفةً
//     أو يرفعها منها دفعةً واحدة.
//   • **السابقةُ والتاليةُ في صفحة الفائدة تتبعان القائمةَ التي جاء منها
//     القارئ** (`perks.trail`)، بترشيحها وترتيبها — لا ترتيبَ التقييد وحده.
//   • **فوائدُ ذاتُ صلة** في صفحة الفائدة، بالأعلام والوسوم والأبواب.
//   • **الكرّاسةُ بحثٌ مصغَّر**: تُرتَّب فوائدُها وتُقسَم فصولًا، وتُطبع وتُنزَّل
//     مستندًا يفتحه «وورد» أو نصَّ Markdown.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { useLibrary, useNeedPerks } from '../lib/library'
import { goBack, hashFor, linkTo, navigate } from '../lib/router'
import { presetViewState, useViewState } from '../lib/viewState'
import { Icon } from '../lib/icons'
import { QUICK_OPTS, highlightPattern, normalizeText } from '../lib/search'
import { Hl } from '../lib/highlight'
import {
  EMPTY_FILTER, PERK_SORTS, PICK_FIELDS, activeFilters, facetCounts, filterIsOn,
  filterPerks, isPickField, notebookTallies, perkDate, perkLink, perkName, perkPeople,
  perkSources, perkTags, perkTopics, randomPerk, sortPerks, sourceTitle,
  type PerkFilter, type PerkSort, type PickField, type Tally,
} from '../lib/perks'
import {
  fileName, notebookDoc, notebookEntries, notebookMarkdown, toLayout, type NotebookItem,
} from '../lib/perkExport'
import { downloadBlob } from '../lib/perkImage'
import {
  CATEGORIES_COUNT, FIGURES_COUNT, GEMS_COUNT, NOTEBOOKS_COUNT, PERKS_COUNT,
  PERK_SOURCE_KINDS, SOURCES_COUNT,
  countLabel, countParts, formatNumber,
  type CountForms, type Notebook, type Perk, type PerkKindDef,
} from '../lib/types'
import PerkCard, { PerkComment } from '../components/PerkCard'
import Prose from '../components/Prose'
import RichText from '../components/RichText'
import PerkEditor from '../components/PerkEditor'
import PerkSettings from '../components/PerkSettings'
import { PerkSheet, usePrintJob } from '../components/PerkPrint'
import { IconChoice } from '../components/IconPicker'
import {
  BackButton, ChevronIcon, ClearIcon, DownloadIcon, FilterIcon, GearIcon, GridIcon, HashIcon,
  MoreSentinel, OpenBookIcon, OwnerIcon, PencilIcon, PerkIcon, PrinterIcon, QuoteIcon,
  ScrollIcon, SearchIcon, SuggestIcon, TableIcon, VerifyIcon, ghostButtonStyle,
  inputStyle, overlayOpen, primaryButtonStyle,
} from '../components/ui'

/**
 * القائمةُ التي جاء منها القارئُ إلى صفحة الفائدة: معرّفاتُها على ترتيبها
 * واسمُها. تُكتب حين يُفتح منها شيء، وبها تتبع السابقةُ والتاليةُ ما كان
 * القارئ فيه — مُرشَّحًا ومرتَّبًا — لا ترتيبَ التقييد في الكنّاش كلِّه.
 */
interface Trail { ids: string[]; label: string }
const NO_TRAIL: Trail = { ids: [], label: '' }
const TRAIL_KEY = 'perks.trail'
const rememberTrail = (ids: string[], label: string) => presetViewState(TRAIL_KEY, { ids, label })

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

/** ما يُرسم في كل دفعةٍ بحسب طريقة العرض: الفهرسُ أخفُّ من البطاقة */
const PAGE: Record<ViewKey, number> = { cards: 18, index: 80, reading: 12 }

export default function Perks(
  { tab = '', pick: picked }: { tab?: string; pick?: { field: string; value: string } },
) {
  const {
    perks, notebooks, perkKindList, perkCategoryList, perkFigures, bookById, settings,
    isOwner, canEdit, perkIndex: index,
  } = useLibrary()
  const ready = useNeedPerks()
  const canSee = isOwner || settings.visibility.perks

  const [filter, setFilter] = useViewState<PerkFilter>('perks.filter', EMPTY_FILTER)
  const [sort, setSort] = useViewState<PerkSort>('perks.sort', 'newest')
  const [view, setView] = useViewState<ViewKey>('perks.view', 'cards')
  const [editing, setEditing] = useState<Perk | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  /** الأنواعُ والتصنيفاتُ كما حُرِّرت، وإلّا فالمبدأ — محسوبةً في السياق مرّةً */
  const kinds = perkKindList
  const cats = perkCategoryList

  /**
   * ينتقل إلى باب «الفوائد» ويُصفِّيه بما ضُغط عليه، من أيّ بابٍ كان. **والترشيحُ
   * يُكتب في الرابط**، فيُشارَك ويُعاد إليه، ويرجع القارئُ إليه بزرّ الرجوع.
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
   * ذلك في تاريخ التصفُّح — فمن رفع شرطًا لم يخطُ خطوةً يرجع عنها.
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
   * ما في الرابط هو الترشيحُ القائم. ومن جاء بترشيحٍ جديد ابتُدئ له الأمرُ من
   * رأسه — فهو قاصدٌ بابًا آخر لا مُضيفٌ شرطًا. ومن عاد إلى الكنّاش بزرّ
   * الرجوع وجد ترشيحَه كما تركه: لا يُمحى ما حُفظ من حاله لأنّ رابطَه بلا
   * ترشيح.
   */
  const lastPick = useRef<string | null>(null)
  useEffect(() => {
    const key = picked && isPickField(picked.field) ? `${picked.field}=${picked.value}` : ''
    const first = lastPick.current === null
    lastPick.current = key
    if (key && picked) {
      const field = picked.field as PickField
      if (filter[field] !== picked.value) setFilter({ ...EMPTY_FILTER, [field]: picked.value })
    } else if (!first) {
      setFilter((prev) => ({ ...prev, ...Object.fromEntries(PICK_FIELDS.map((k) => [k, ''])) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.field, picked?.value])

  // «/» يضع المؤشِّرَ في البحث، كما في أكثر مواقع البحث — إلّا أن يكون في حقل
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      // ولا من تحت نافذة: كان «/» في نموذج الفائدة يقفز بالتركيز إلى ما خلفه
      if (overlayOpen()) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const topics = useMemo(() => perkTopics(perks, cats), [perks, cats])
  // والأعلامُ من جدولها لا من الفوائد وحدها: فيها وفياتُهم وأيقوناتُهم،
  // ومنها يُعرض من سُجِّل ولم تُنسَب إليه فائدةٌ بعد
  const people = useMemo(() => perkPeople(perks, perkFigures), [perks, perkFigures])
  const books = useMemo(() => notebookTallies(notebooks, perks), [notebooks, perks])
  const tags = useMemo(() => perkTags(perks), [perks])
  const sources = useMemo(() => perkSources(perks, bookById), [perks, bookById])
  const gems = useMemo(() => perks.filter((p) => p.rating >= 3), [perks])

  const onFeed = tab === '' || tab === 'gems'
  const base = tab === 'gems' ? gems : perks
  const shown = useMemo(
    () => sortPerks(filterPerks(base, filter, bookById, index), sort, bookById),
    [base, filter, sort, bookById, index],
  )

  /** البحثُ في الصدر يبحث في الفوائد: من كتب فيه وهو في بابٍ آخر نُقل إليها */
  function search(query: string) {
    setFilter((prev) => ({ ...prev, query }))
    if (!onFeed && query.trim()) navigate({ name: 'perks' })
  }

  /** فائدةٌ بالقرعة: من المعروض إن كان مُرشَّحًا، وإلّا فمن الكنّاش كلِّه */
  function lucky() {
    const pool = onFeed && shown.length > 0 ? shown : perks
    const p = randomPerk(pool)
    if (p) navigate({ name: 'perk', id: p.id })
  }

  const tabCount: Record<string, number> = {
    '': perks.length,
    topics: topics.filter((t) => t.count > 0).length,
    people: people.filter((t) => t.count > 0).length,
    notebooks: books.length,
    sources: sources.length,
    gems: gems.length,
  }

  return (
    <main className="app-main kn-page">
      {/* ----------------------------------------------------------- الصدر */}
      <header className="kn-hero">
        <div className="kn-hero-top">
          <span className="kn-hero-mark" aria-hidden="true"><PerkIcon size={28} /></span>
          <div className="kn-hero-titles">
            <span className="kn-eyebrow">كنّاشُ المكتبة</span>
            <h1>الفوائد والمقتطفات</h1>
            <p>
              ما قُيِّد من كتبها ومن غيرها — تحريرًا لمسألة، أو تعقُّبًا على قول،
              أو نصًّا نُقل بحروفه.
            </p>
          </div>

          <div className="kn-hero-actions">
            {canSee && perks.length > 1 && (
              <button type="button" className="kn-btn kn-btn-ghost" onClick={lucky}>
                <SuggestIcon size={16} />
                <span>فائدةٌ بالقرعة</span>
              </button>
            )}
            {canEdit && (
              <>
                <button type="button" className="kn-btn kn-btn-primary" onClick={() => setEditing(null)}>
                  <span aria-hidden="true">+</span>
                  <span>فائدةٌ جديدة</span>
                </button>
                <button
                  type="button"
                  className="kn-btn kn-btn-icon"
                  onClick={() => setSettingsOpen(true)}
                  title="إعدادات الفوائد — الأنواع والتصنيفات والأعلام"
                  aria-label="إعدادات الفوائد"
                >
                  <GearIcon size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {canSee && ready && perks.length > 0 && (
          <>
            <label className="kn-search">
              <SearchIcon size={18} />
              <input
                ref={searchRef}
                value={filter.query}
                onChange={(e) => search(e.target.value)}
                placeholder="ابحث في الفوائد: نصًّا، أو عنوانًا، أو عَلَمًا، أو مصدرًا…"
                aria-label="ابحث في الفوائد"
              />
              {filter.query ? (
                <button
                  type="button"
                  onClick={() => search('')}
                  aria-label="امسح البحث"
                  className="kn-search-clear"
                >
                  <ClearIcon size={14} />
                </button>
              ) : (
                <kbd className="kn-kbd" title="اضغط «/» من أيّ موضعٍ في الصفحة">/</kbd>
              )}
            </label>

            {/* الأعدادُ أبوابٌ تُفتح، وما كان صفرًا لا يُعرض — ليس خبرًا */}
            <div className="kn-stats">
              <Stat n={perks.length} forms={PERKS_COUNT} onOpen={() => openTab('')} />
              <Stat n={sources.length} forms={SOURCES_COUNT} onOpen={() => openTab('sources')} />
              <Stat n={tabCount.topics} forms={CATEGORIES_COUNT} onOpen={() => openTab('topics')} />
              <Stat n={tabCount.people} forms={FIGURES_COUNT} onOpen={() => openTab('people')} />
              <Stat n={books.length} forms={NOTEBOOKS_COUNT} onOpen={() => openTab('notebooks')} />
              <Stat n={gems.length} forms={GEMS_COUNT} onOpen={() => openTab('gems')} gem />
            </div>
          </>
        )}
      </header>

      {canSee && (
        <nav className="kn-tabs thin-scroll" aria-label="أبواب الكنّاش">
          {TABS.map(({ key, label, icon: Icons }) => (
            <a
              key={key || 'feed'}
              {...linkTo(key ? { name: 'perks', tab: key } : { name: 'perks' })}
              onClick={(e) => { e.preventDefault(); openTab(key) }}
              className={key === tab ? 'kn-tab kn-tab-on' : 'kn-tab'}
              aria-current={key === tab ? 'page' : undefined}
            >
              <Icons size={16} />
              <span>{label}</span>
              {tabCount[key] > 0 && <span className="kn-tab-count">{formatNumber(tabCount[key])}</span>}
            </a>
          ))}
        </nav>
      )}

      {!canSee ? (
        <KnEmpty title="الفوائد والمقتطفات غير معروضة" />
      ) : !ready ? (
        // والفوائدُ في الطريق: لا يُقال «لم تُقيَّد فائدةٌ بعد» قبل أن تصل
        <KnLoading />
      ) : perks.length === 0 && (tab === '' || tab === 'gems' || tab === 'sources') ? (
        <KnEmpty
          title="لم تُقيَّد فائدةٌ بعد"
          hint={canEdit
            ? 'ابدأ بواحدة: اضغط «فائدةٌ جديدة»، أو قيِّدها من صفحة كتابها.'
            : 'تُسجَّل الفائدةُ من صفحة الكتاب الذي استُخرجت منه.'}
          action={canEdit ? { label: 'فائدةٌ جديدة', onClick: () => setEditing(null) } : undefined}
        />
      ) : (
        <>
          {onFeed && (
            <Feed
              all={base}
              perks={shown}
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
              index={index}
              onEdit={canEdit ? setEditing : undefined}
              onPick={pick}
              onDrop={dropFilter}
              onClear={clearFilter}
            />
          )}

          {tab === 'topics' && (
            <Board
              rows={topics}
              hint="أبوابُ العلم التي تتوزّع عليها الفوائد، ومعها فروعُها. وهي قائمةٌ بنفسها لا صلةَ لها بتصنيفات الكتب، وتُحرَّر من إعدادات القسم."
              onPick={(row) => pick('category', row.name)}
              onPickChild={(row) => pick('subCategory', row.name)}
              empty="لم يُحرَّر تصنيفٌ بعد."
              placeholder="ابحث في التصنيفات…"
            />
          )}

          {tab === 'people' && (
            <Board
              rows={people}
              hint="سجلُّ الأعلام: من ذُكر في فائدة، ومعه وفاتُه إن عُرفت. ويُسجَّل العَلَمُ من نموذج الفائدة أوّلَ مرّةٍ يُكتب اسمُه. واضغط الاسمَ يجتمع لك ما يتعلَّق به."
              onPick={(row) => pick('person', row.name)}
              empty="لم يُسجَّل عَلَمٌ بعد."
              placeholder="ابحث عن عَلَم…"
            />
          )}

          {tab === 'notebooks' && <Notebooks rows={books} />}

          {tab === 'sources' && (
            <Board
              rows={sources}
              hint="كلُّ ما أفاد: كتبُ الفهرس، وما قُرئ أو سُمع من خارجها — من شيخٍ في مجلسه، أو صفحةٍ على الشبكة، أو منشورٍ أو تسجيل."
              onPick={(row) => pick('source', row.name)}
              empty="لم يُقيَّد من مصدرٍ بعد."
              placeholder="ابحث في المصادر…"
              byKind
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

// ------------------------------------------------------------ لوحُ العدد
/**
 * لوحُ عددٍ في الصدر، وهو بابُه: الضغطُ عليه يفتحه. **ولفظُه من `countParts`
 * لا بقالبٍ نصّيّ**، فلا يُقرأ «١ فائدةً» ولا «٢ عَلَمًا». وما كان صفرًا لا
 * يُعرض — بطاقةٌ تقرأ صفرًا ليست خبرًا.
 */
function Stat(
  { n, forms, onOpen, gem }: { n: number; forms: CountForms; onOpen: () => void; gem?: boolean },
) {
  if (n <= 0) return null
  const { value, label } = countParts(n, forms)
  return (
    <button
      type="button"
      className={gem ? 'kn-stat kn-stat-gem' : 'kn-stat'}
      onClick={onOpen}
      aria-label={countLabel(n, forms)}
    >
      <span className="kn-stat-value">{value}</span>
      <span className="kn-stat-label">{label}</span>
    </button>
  )
}

/** الكنّاشُ في الطريق: موضعٌ بزخرفته يقول ذلك، لا صفحةٌ تدّعي الخلوّ */
function KnLoading() {
  return (
    <div className="kn-empty kn-loading" role="status">
      <span className="kn-empty-orn" aria-hidden="true" />
      <p>يُحمَّل الكنّاش…</p>
    </div>
  )
}

// ------------------------------------------------------- الصفحةُ الخالية
/** موضعٌ خالٍ بزخرفته: يقول ما الخبر، ويدلّ على ما يُصنع إن كان شيءٌ يُصنع */
function KnEmpty(
  { title, hint, action }: {
    title: string
    hint?: string
    action?: { label: string; onClick: () => void }
  },
) {
  return (
    <div className="kn-empty">
      <span className="kn-empty-orn" aria-hidden="true" />
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
      {action && (
        <button type="button" className="kn-btn kn-btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

// --------------------------------------------------- بابُ الفوائد: مجموعةً
function Feed(
  { all, perks, gemsTab, filter, setFilter, sort, setSort, view, setView, topics, tags,
    kinds, index, onEdit, onPick, onDrop, onClear }: {
    /** فوائدُ الباب قبل الترشيح: الكنّاشُ كلُّه، أو نفائسُه */
    all: Perk[]
    perks: Perk[]
    /** بابُ النفائس: القائمةُ مُرشَّحةٌ به قبل الشريط، فلا يُعرض مُنتقي النفاسة */
    gemsTab: boolean
    filter: PerkFilter
    setFilter: (f: PerkFilter | ((prev: PerkFilter) => PerkFilter)) => void
    sort: PerkSort
    setSort: (s: PerkSort) => void
    view: ViewKey
    setView: (v: ViewKey) => void
    topics: Tally[]
    tags: Tally[]
    kinds: PerkKindDef[]
    index: Map<string, string>
    onEdit?: (perk: Perk) => void
    onPick: (field: PickField, value: string) => void
    onDrop: (field: keyof PerkFilter) => void
    onClear: () => void
  },
) {
  const { bookById, notebooks, canEdit } = useLibrary()
  const [railOpen, setRailOpen] = useState(false)
  const on = filterIsOn(filter)
  const chips = activeFilters(filter, notebooks)
  const listRef = useRef<HTMLDivElement>(null)
  const re = useMemo(() => highlightPattern(filter.query), [filter.query])

  // التحديدُ للتعديل الجماعي: لصاحب المكتبة وحده، ويُفتح بزرّه
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const togglePicked = (perk: Perk) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(perk.id)) next.delete(perk.id)
    else next.add(perk.id)
    return next
  })

  const facets = useMemo(
    () => facetCounts(all, filter, bookById, index),
    [all, filter, bookById, index],
  )

  // الرسمُ على دفعات، والعددُ المرسوم يُعاد إلى أوّله متى تبدّل الترشيح
  const [limit, setLimit] = useViewState('perks.limit', PAGE[view])
  const key = JSON.stringify([filter, sort, view, gemsTab])
  const lastKey = useRef(key)
  useEffect(() => {
    if (lastKey.current === key) return
    lastKey.current = key
    setLimit(PAGE[view])
  }, [key, view, setLimit])
  const page = perks.slice(0, limit)
  const more = () => setLimit((n) => n + PAGE[view])

  /**
   * القائمةُ المعروضة تُحفظ حين يُفتح منها شيء، فتتبعها السابقةُ والتاليةُ في
   * صفحة الفائدة: من رشّح بعَلَمٍ ثم فتح فائدةً يمضي في فوائد ذلك العَلَم.
   */
  const trailLabel = gemsTab ? 'النفائس' : on ? 'القائمة المرشَّحة' : 'الكنّاش'
  const keepTrail = () => rememberTrail(perks.map((p) => p.id), trailLabel)

  /**
   * التنقّلُ بالمفاتيح: j إلى التالية وk إلى السابقة، وo يفتح المُضاءة، وx
   * يُحدِّدها في وضع التحديد. **بمواضع المفاتيح لا بحروفها** (`e.code`): لوحةُ
   * المفاتيح العربية تكتب في موضع j حرفَ التاء، فلو سُئل عن الحرف لما عمل
   * المفتاحُ إلا بعد تبديل اللغة.
   */
  const pageLen = page.length
  const total = perks.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || overlayOpen()) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      if (!['KeyJ', 'KeyK', 'KeyO', 'KeyX'].includes(e.code)) return
      const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-perk-id]') ?? [])]
      if (!items.length) return
      const current = items.findIndex((it) => it.contains(document.activeElement))
      e.preventDefault()

      if (e.code === 'KeyO' || e.code === 'KeyX') {
        const item = items[current]
        if (!item) return
        const id = item.dataset.perkId!
        if (e.code === 'KeyO') {
          keepTrail()
          navigate({ name: 'perk', id })
        } else if (selecting) {
          const perk = perks.find((p) => p.id === id)
          if (perk) togglePicked(perk)
        }
        return
      }
      const step = e.code === 'KeyJ' ? 1 : -1
      const next = Math.max(0, Math.min(items.length - 1, current + step))
      // بلغ آخرَ المرسوم: تُرسم الدفعةُ التالية قبل أن يمضي
      if (step > 0 && next >= items.length - 2 && pageLen < total) more()
      const target = items[current < 0 ? 0 : next]
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const toggle = (field: 'kind' | 'category' | 'subCategory' | 'tag', value: string) =>
    setFilter((prev) => ({
      ...prev,
      [field]: prev[field] === value ? '' : value,
      ...(field === 'category' ? { subCategory: '' } : {}),
    }))

  const railCount = chips.filter((c) => c.field !== 'query').length

  return (
    <div className={`kn-feed${railOpen ? ' kn-rail-open' : ''}${selecting ? ' kn-feed-selecting' : ''}`}>
      {/* ------------------------------------------------- عمودُ الترشيح */}
      <aside className="kn-rail thin-scroll" aria-label="ترشيح الفوائد">
        <div className="kn-rail-head">
          <span><FilterIcon size={15} /> ترشيحُ الفوائد</span>
          <button
            type="button"
            className="kn-icon-btn kn-rail-close"
            onClick={() => setRailOpen(false)}
            aria-label="أغلق الترشيح"
          >
            <ClearIcon size={14} />
          </button>
        </div>

        <RailGroup title="النوع">
          {kinds.map((k) => {
            const n = facets.kinds.get(k.name) ?? 0
            const active = filter.kind === k.name
            if (!n && !active) return null
            return (
              <RailItem
                key={k.name}
                icon={<Icon name={k.icon} size={14} plain={active} />}
                label={k.name}
                count={n}
                active={active}
                hint={k.hint}
                onClick={() => toggle('kind', k.name)}
              />
            )
          })}
        </RailGroup>

        <RailGroup title="التصنيف">
          {topics.map((t) => {
            const n = facets.categories.get(t.name) ?? 0
            const active = filter.category === t.name
            // والبابُ الفارغ يُعرض في شبكة التصنيفات — «بابٌ فارغٌ خبر» —
            // وأمّا ههنا فخيارٌ لا مطابقَ له، فلا يُعرض
            if (!n && !active) return null
            const kids = (t.children ?? []).filter(
              (c) => (facets.subs.get(c.name) ?? 0) > 0 || filter.subCategory === c.name,
            )
            return (
              <div key={t.name}>
                <RailItem
                  icon={<Icon name={t.icon} size={14} plain={active} />}
                  label={t.name}
                  count={n}
                  active={active}
                  onClick={() => toggle('category', t.name)}
                />
                {active && kids.length > 0 && (
                  <div className="kn-rail-kids">
                    {kids.map((c) => (
                      <RailItem
                        key={c.name}
                        icon={<Icon name={c.icon} size={12} plain={filter.subCategory === c.name} />}
                        label={c.name}
                        count={facets.subs.get(c.name) ?? 0}
                        active={filter.subCategory === c.name}
                        onClick={() => toggle('subCategory', c.name)}
                        small
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </RailGroup>

        {/* والنفاسةُ لا تُسأل في باب النفائس: القائمةُ مُرشَّحةٌ بالنجوم الثلاث
            قبل الشريط، فخياراتُه الأربعة كلُّها بلا أثر */}
        {!gemsTab && (
          <RailGroup title="النفاسة">
            <div className="kn-seg" role="group" aria-label="النفاسة">
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={filter.minRating === n ? 'on' : ''}
                  aria-pressed={filter.minRating === n}
                  onClick={() => setFilter((prev) => ({ ...prev, minRating: n }))}
                  title={n === 0 ? 'كلُّ النفاسات' : n === 3 ? 'النفائس وحدها' : `النجوم: ${n} فما فوق`}
                >
                  {n === 0 ? 'الكل' : '★'.repeat(n)}
                </button>
              ))}
            </div>
          </RailGroup>
        )}

        {tags.length > 0 && (
          <RailGroup title="الوسوم">
            <TagCloud tags={tags} value={filter.tag} onToggle={(t) => toggle('tag', t)} />
          </RailGroup>
        )}

        {/* ومفاتيحُ القسم مكتوبةً: خصلةٌ لا يُنتفع بها من لا يعلمها */}
        <p className="kn-keys" aria-hidden="true">
          <kbd>/</kbd> للبحث · <kbd>j</kbd> <kbd>k</kbd> للتنقّل · <kbd>o</kbd> للفتح
        </p>
      </aside>

      {/* ---------------------------------------------------- القائمة */}
      <div className="kn-main">
        <div className="kn-toolbar">
          <button
            type="button"
            className="kn-btn kn-btn-ghost kn-rail-toggle"
            onClick={() => setRailOpen(true)}
          >
            <FilterIcon size={15} />
            <span>ترشيح</span>
            {railCount > 0 && <span className="kn-badge">{formatNumber(railCount)}</span>}
          </button>

          <span className="kn-count">
            <strong>{countLabel(perks.length, PERKS_COUNT)}</strong>
            {on && perks.length !== all.length && <span> من {formatNumber(all.length)}</span>}
          </span>

          <span className="kn-toolbar-gap" />

          {canEdit && view !== 'reading' && (
            <button
              type="button"
              className={selecting ? 'kn-btn kn-btn-primary kn-btn-sm' : 'kn-btn kn-btn-ghost kn-btn-sm'}
              onClick={() => { setSelecting((v) => !v); setPicked(new Set()) }}
              aria-pressed={selecting}
              title="حدِّد فوائدَ ثم أضِف إليها صفةً أو ارفعها منها دفعةً واحدة"
            >
              <VerifyIcon size={14} />
              <span>{selecting ? 'أنهِ التحديد' : 'تحديد'}</span>
            </button>
          )}

          <label className="kn-sort">
            <span>الترتيب</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as PerkSort)}>
              {PERK_SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>

          <div className="kn-views" role="group" aria-label="طريقة العرض">
            {VIEWS.map(({ key, label, icon: Icons }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                title={label}
                aria-label={label}
                aria-pressed={view === key}
                className={view === key ? 'on' : ''}
              >
                <Icons size={16} />
              </button>
            ))}
          </div>
        </div>

        {/*
          الترشيحُ القائم مقروءًا، شارةً لكلّ شرط: العَلَمُ والفرعُ والكرّاسةُ
          والمصدرُ تُرشَّح بها القائمةُ ولا رُقعةَ لها في العمود، فيقف القارئُ
          على قائمةٍ نقصت لا يدري بأيّ شيءٍ نقصت. وكلُّ شارةٍ تُرفع وحدَها.
        */}
        {chips.length > 0 && (
          <div className="kn-active">
            {chips.map((chip) => (
              <button
                key={`${chip.field}:${chip.value}`}
                type="button"
                className="kn-active-chip"
                onClick={() => onDrop(chip.field)}
                title={`ارفع هذا الشرط: ${chip.label}`}
              >
                <span className="kn-active-name">{chip.label}</span>
                <span className="kn-active-value">{chip.value}</span>
                <ClearIcon size={11} />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" className="kn-active-clear" onClick={onClear}>
                ارفع الترشيح كلَّه
              </button>
            )}
          </div>
        )}

        <div
          ref={listRef}
          // ومن فتح فائدةً من القائمة حُفظت القائمةُ لصفحتها
          onClickCapture={(e) => {
            if ((e.target as Element).closest('a[href*="/perk/"]')) keepTrail()
          }}
        >
          {perks.length === 0 ? (
            <KnEmpty
              title={gemsTab && !on ? 'لم تُوسَم فائدةٌ بالنجوم الثلاث بعد' : 'لا فائدةَ تطابق'}
              hint={gemsTab && !on
                ? 'تُعلَّم النفاسةُ من صفحة الفائدة بعد قيدها.'
                : 'جرِّب كلمةً أخرى، أو ارفع شرطًا من الترشيح.'}
            />
          ) : view === 'index' ? (
            <ol className="kn-index">
              {page.map((p) => (
                <li key={p.id} className={picked.has(p.id) ? 'picked' : undefined}>
                  {selecting && (
                    <input
                      type="checkbox"
                      className="kn-index-check"
                      checked={picked.has(p.id)}
                      onChange={() => togglePicked(p)}
                      aria-label={`تحديد: ${perkName(p, 40)}`}
                    />
                  )}
                  <a {...linkTo({ name: 'perk', id: p.id })} data-perk-id={p.id}>
                    <span className="kn-index-kind">{p.kinds[0] ?? ''}</span>
                    <span className="kn-index-title"><Hl text={perkName(p)} re={re} /></span>
                    <span className="kn-index-src">
                      {sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined)}
                    </span>
                    {p.rating > 0 && <span className="kn-stars">{'★'.repeat(p.rating)}</span>}
                    <span className="kn-index-date">{perkDate(p)}</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : view === 'reading' ? (
            /*
              مطالعةٌ متّصلة: النصوصُ وحدها يتلو بعضُها بعضًا كصفحةِ كتاب، ولكلٍّ
              عزوُه تحته. **والنصُّ منسَّقٌ بهوامشه** كما في البطاقة سواءً بسواء،
              ويُعرض معه تعليقُ المُقيِّد مفصولًا.
            */
            <div className="kn-reading">
              {page.map((p) => (
                <section key={p.id} data-perk-id={p.id} tabIndex={-1}>
                  {p.title && <h3><Hl text={p.title} re={re} /></h3>}
                  <RichText
                    html={p.text_html}
                    text={p.text}
                    footnotes={p.footnotes}
                    highlight={filter.query}
                  />
                  {p.comment && <PerkComment text={p.comment} highlight={re} />}
                  <footer>
                    <a {...linkTo({ name: 'perk', id: p.id })}>
                      {sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined) || 'الفائدة'}
                    </a>
                  </footer>
                </section>
              ))}
            </div>
          ) : (
            <div className="kn-list">
              {page.map((p) => (
                <PerkCard
                  key={p.id}
                  perk={p}
                  onEdit={onEdit}
                  onPick={onPick}
                  highlight={filter.query}
                  selected={picked.has(p.id)}
                  onSelect={selecting ? togglePicked : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <MoreSentinel shown={page.length} total={perks.length} onMore={more} />

        {/* في عمود القائمة لا عرضَ الصفحة: يلصق تحت ما يُحدَّد منه */}
        {selecting && (
          <BulkBar
            ids={[...picked].filter((id) => perks.some((p) => p.id === id))}
            shown={perks}
            kinds={kinds}
            topics={topics}
            tags={tags}
            onAll={() => setPicked(new Set(perks.map((p) => p.id)))}
            onNone={() => setPicked(new Set())}
            onDone={() => { setSelecting(false); setPicked(new Set()) }}
          />
        )}
      </div>

      {/* ظلُّ الدُّرج على الجوّال: الضغطُ عليه يُغلقه */}
      <button
        type="button"
        className="kn-rail-shade"
        aria-label="أغلق الترشيح"
        tabIndex={-1}
        onClick={() => setRailOpen(false)}
      />
    </div>
  )
}

/** الحقولُ التي تُعدَّل جماعيًّا، بأسمائها كما يقرؤها صاحبُ المكتبة */
const BULK_FIELDS: { key: api.BulkField; label: string }[] = [
  { key: 'categories', label: 'التصنيف' },
  { key: 'sub_categories', label: 'الفرع' },
  { key: 'kinds', label: 'النوع' },
  { key: 'tags', label: 'الوسم' },
  { key: 'people', label: 'العَلَم' },
  { key: 'notebook_ids', label: 'الكرّاسة' },
]

/**
 * شريطُ التعديل الجماعي: يلصق بأسفل الشاشة ما دام التحديدُ قائمًا. فيه عددُ
 * المحدَّد، وتحديدُ المعروض كلِّه أو رفعُه، ثم الصفةُ وقيمتُها: «أضِف التصنيف
 * الفقه» أو «ارفع الوسم كذا». والقيمةُ تُختار ممّا في الكنّاش، إلّا الوسمَ
 * والعَلَم فيُكتبان — يُسجَّل العَلَمُ الجديد كما يُسجَّل من النموذج.
 */
function BulkBar(
  { ids, shown, kinds, topics, tags, onAll, onNone, onDone }: {
    ids: string[]
    shown: Perk[]
    kinds: PerkKindDef[]
    topics: Tally[]
    tags: Tally[]
    onAll: () => void
    onNone: () => void
    onDone: () => void
  },
) {
  const { notebooks, perkFigures, run } = useLibrary()
  const [op, setOp] = useState<'add' | 'remove'>('add')
  const [field, setField] = useState<api.BulkField>('categories')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  /** ما يُختار منه لكل حقل: اسمٌ يُعرض وقيمةٌ تُحفظ */
  const choices = useMemo((): { value: string; label: string }[] | null => {
    const named = (names: string[]) => names.map((n) => ({ value: n, label: n }))
    switch (field) {
      case 'kinds': return named(kinds.map((k) => k.name))
      case 'categories': return named(topics.map((t) => t.name))
      case 'sub_categories': return named(topics.flatMap((t) => (t.children ?? []).map((c) => c.name)))
      case 'notebook_ids': return notebooks.map((n) => ({ value: n.id, label: n.name }))
      default: return null
    }
  }, [field, kinds, topics, notebooks])
  const suggestions = field === 'tags'
    ? tags.map((t) => t.name)
    : field === 'people' ? perkFigures.map((f) => f.name) : []

  async function apply() {
    const v = value.trim()
    if (!v || !ids.length) return
    setBusy(true)
    const ok = await run(() => api.bulkEditPerks(ids, field, op, v))
    setBusy(false)
    if (ok) setValue('')
  }

  return (
    <div className="kn-bulk" role="region" aria-label="التعديل الجماعي">
      <span className="kn-bulk-count">{countLabel(ids.length, { noun: 'المحدَّد' })}</span>
      {/* «الكلّ» حتى يُحدَّد المعروضُ كلُّه، ثم «لا شيء» */}
      {ids.length < shown.length ? (
        <button type="button" className="kn-link-btn" onClick={onAll}>
          حدِّد المعروضَ ({formatNumber(shown.length)})
        </button>
      ) : (
        <button type="button" className="kn-link-btn" onClick={onNone}>ارفع التحديد</button>
      )}

      <span className="kn-bulk-sep" aria-hidden="true" />

      <div className="kn-seg" role="group" aria-label="العمل">
        <button type="button" className={op === 'add' ? 'on' : ''} onClick={() => setOp('add')}>
          أضِف
        </button>
        <button type="button" className={op === 'remove' ? 'on' : ''} onClick={() => setOp('remove')}>
          ارفع
        </button>
      </div>
      <select
        className="kn-bulk-ctl"
        value={field}
        onChange={(e) => { setField(e.target.value as api.BulkField); setValue('') }}
        aria-label="الصفة"
      >
        {BULK_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      {choices ? (
        <select
          className="kn-bulk-ctl"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="القيمة"
        >
          <option value="">— اختر —</option>
          {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      ) : (
        <>
          <input
            className="kn-bulk-ctl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply() } }}
            list="kn-bulk-list"
            placeholder={field === 'tags' ? 'الوسم' : 'اسمُ العَلَم'}
            aria-label="القيمة"
          />
          <datalist id="kn-bulk-list">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </>
      )}
      <button
        type="button"
        className="kn-btn kn-btn-primary"
        disabled={busy || !ids.length || !value.trim()}
        onClick={() => void apply()}
      >
        {busy ? 'يُحفَظ…' : 'نفِّذ'}
      </button>
      <button
        type="button"
        className="kn-bulk-close"
        onClick={onDone}
        title="أنهِ التحديد"
        aria-label="أنهِ التحديد"
      >
        <ClearIcon size={13} />
      </button>
    </div>
  )
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children
  if (Array.isArray(items) && items.length === 0) return null
  return (
    <section className="kn-rail-group">
      <h3>{title}</h3>
      <div className="kn-rail-items">{children}</div>
    </section>
  )
}

function RailItem(
  { icon, label, count, active, onClick, hint, small }: {
    icon: ReactNode
    label: string
    count: number
    active: boolean
    onClick: () => void
    hint?: string
    small?: boolean
  },
) {
  return (
    <button
      type="button"
      className={`kn-rail-item${active ? ' on' : ''}${small ? ' small' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      title={hint || undefined}
    >
      <span className="kn-rail-icon">{icon}</span>
      <span className="kn-rail-label">{label}</span>
      <span className="kn-rail-count">{formatNumber(count)}</span>
    </button>
  )
}

/** سحابةُ الوسوم: أكثرُها أوّلًا، ويُطوى ما زاد على عشرين حتى يُطلب */
function TagCloud(
  { tags, value, onToggle }: { tags: Tally[]; value: string; onToggle: (t: string) => void },
) {
  const [all, setAll] = useState(false)
  const shown = all ? tags : tags.slice(0, 20)
  return (
    <div className="kn-tagcloud">
      {shown.map((t) => (
        <button
          key={t.name}
          type="button"
          className={value === t.name ? 'kn-tag on' : 'kn-tag'}
          onClick={() => onToggle(t.name)}
          aria-pressed={value === t.name}
        >
          <HashIcon size={10} />
          {t.name}
          <span className="kn-tag-count">{formatNumber(t.count)}</span>
        </button>
      ))}
      {tags.length > 20 && (
        <button type="button" className="kn-link-btn" onClick={() => setAll((v) => !v)}>
          {all ? 'أقلّ' : `الوسومُ كلُّها (${formatNumber(tags.length)})`}
        </button>
      )}
    </div>
  )
}

// ------------------------------------------- التصنيفات والأعلام والمصادر
/**
 * لوحُ أسماءٍ بأعدادها: به تُعرض التصنيفاتُ والأعلامُ والمصادر. وفيه ما لم
 * يكن: **بحثٌ في الأسماء** — فالأعلامُ والمصادرُ تكثر حتى لا تُمسح بالعين —
 * و**ترتيبٌ بالأكثر أو بالحروف**، و**شريطٌ تحت كلّ اسمٍ بقدر ما تحته** فيُرى
 * أكثرُ الأبواب نصيبًا بنظرة. وللمصادر وحدَها **ترشيحٌ بالجنس**: الفهرسُ،
 * فالسماعُ، فالشبكة…
 */
function Board(
  { rows, hint, onPick, onPickChild, empty, placeholder, byKind }: {
    rows: Tally[]
    hint: string
    onPick: (row: Tally) => void
    onPickChild?: (row: Tally) => void
    empty: string
    placeholder: string
    byKind?: boolean
  },
) {
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<'count' | 'alpha'>('count')
  const [kind, setKind] = useState<string | null>(null)

  const kindsHere = useMemo(() => {
    if (!byKind) return []
    const present = new Set(rows.map((r) => r.kind ?? ''))
    return [
      ...(present.has('') ? [{ key: '', label: 'من المكتبة', icon: 'shelf' }] : []),
      ...PERK_SOURCE_KINDS.filter((k) => present.has(k.name))
        .map((k) => ({ key: k.name, label: k.badge, icon: k.icon })),
    ]
  }, [rows, byKind])

  const shown = useMemo(() => {
    const needle = normalizeText(query.trim(), QUICK_OPTS)
    const list = rows.filter((r) => (kind === null || (r.kind ?? '') === kind)
      && (!needle
        || normalizeText(`${r.name} ${r.note ?? ''} ${(r.children ?? []).map((c) => c.name).join(' ')}`, QUICK_OPTS)
          .includes(needle)))
    return order === 'alpha'
      ? [...list].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      : list
  }, [rows, query, order, kind])

  if (rows.length === 0) return <KnEmpty title={empty} />
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <section className="kn-board">
      <p className="kn-hint">{hint}</p>

      <div className="kn-board-bar">
        {rows.length > 8 && (
          <label className="kn-search kn-search-sm">
            <SearchIcon size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            {query && (
              <button type="button" className="kn-search-clear" onClick={() => setQuery('')} aria-label="امسح">
                <ClearIcon size={13} />
              </button>
            )}
          </label>
        )}
        <span className="kn-toolbar-gap" />
        <div className="kn-seg" role="group" aria-label="الترتيب">
          <button type="button" className={order === 'count' ? 'on' : ''} onClick={() => setOrder('count')}>
            الأكثر
          </button>
          <button type="button" className={order === 'alpha' ? 'on' : ''} onClick={() => setOrder('alpha')}>
            أ — ي
          </button>
        </div>
      </div>

      {kindsHere.length > 1 && (
        <div className="kn-kindbar">
          <button type="button" className={kind === null ? 'kn-pill on' : 'kn-pill'} onClick={() => setKind(null)}>
            الكلّ
          </button>
          {kindsHere.map((k) => (
            <button
              key={k.key || 'library'}
              type="button"
              className={kind === k.key ? 'kn-pill on' : 'kn-pill'}
              onClick={() => setKind(kind === k.key ? null : k.key)}
            >
              <Icon name={k.icon} size={13} plain={kind === k.key} />
              {k.label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <KnEmpty title="لا مطابق" hint="جرِّب كلمةً أخرى." />
      ) : (
        <div className="kn-grid">
          {shown.map((row) => (
            <div key={row.name} className={row.count > 0 ? 'kn-tile' : 'kn-tile kn-tile-empty'}>
              <button type="button" className="kn-tile-head" onClick={() => onPick(row)}>
                {row.icon && (
                  <span className="kn-tile-icon" aria-hidden="true">
                    <Icon name={row.icon} size={24} />
                  </span>
                )}
                <span className="kn-tile-text">
                  <span className="kn-tile-name">{row.name}</span>
                  {/* خبرُه تحت اسمه: وفاةُ العَلَم، أو جنسُ المصدر */}
                  {row.note && <span className="kn-tile-note">{row.note}</span>}
                </span>
                <span className="kn-tile-count">
                  {row.count > 0 ? formatNumber(row.count) : '—'}
                </span>
              </button>
              <span className="kn-tile-bar" aria-hidden="true">
                <span style={{ width: `${(row.count / max) * 100}%` }} />
              </span>

              {row.children && row.children.length > 0 && (
                <div className="kn-tile-kids">
                  {row.children.map((kid) => (
                    <button
                      key={kid.name}
                      type="button"
                      onClick={() => (onPickChild ?? onPick)(kid)}
                      className={kid.count > 0 ? '' : 'empty'}
                    >
                      {kid.icon && <Icon name={kid.icon} size={13} />}
                      {kid.name}
                      {kid.count > 0 && <span>{formatNumber(kid.count)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- الكرّاسات
/**
 * الكرّاسات: مسائلُ تُفتح ثم يُجمع لها المتفرِّق. وهي جدولٌ قائم لا تُشتقّ من
 * الفوائد، فتقوم الكرّاسةُ وهي بعدُ خالية — ومن صفحتها تُضاف الفوائدُ الداخلة
 * فيها. وبطاقتُها في هيئة كرّاسةٍ حقًّا: كعبٌ ملوَّن ووجهٌ عليه اسمُها.
 */
function Notebooks({ rows }: { rows: Tally[] }) {
  const { notebooks, canEdit, run, reload } = useLibrary()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('notebook')
  const [adding, setAdding] = useState(false)
  const noteOf = new Map(notebooks.map((n) => [n.id, n.note]))

  async function add() {
    if (!name.trim()) return
    const ok = await run(() => api.insertNotebook(name.trim(), '', icon))
    if (!ok) return
    await reload()
    setName('')
    setAdding(false)
  }

  return (
    <section className="kn-board">
      <p className="kn-hint">
        مسائلُ يُجمع لها المتفرِّق من الفوائد فتصير بحثًا مصغَّرًا. تُفتح
        الكرّاسةُ ههنا، ثم تُضاف إليها الفوائدُ من صفحتها.
      </p>

      {rows.length === 0 && !canEdit && <KnEmpty title="لم تُفتح كرّاسةٌ بعد." />}

      <div className="kn-notebooks">
        {rows.map((row) => (
          <a key={row.id} className="kn-notebook" {...linkTo({ name: 'notebook', id: row.id! })}>
            <span className="kn-notebook-spine" aria-hidden="true" />
            <span className="kn-notebook-icon" aria-hidden="true">
              <Icon name={row.icon || 'notebook'} size={26} />
            </span>
            <span className="kn-notebook-name">{row.name}</span>
            {noteOf.get(row.id!) && (
              <span className="kn-notebook-note">{noteOf.get(row.id!)}</span>
            )}
            <span className="kn-notebook-count">
              {row.count > 0 ? countLabel(row.count, PERKS_COUNT) : 'خالية بعدُ'}
            </span>
          </a>
        ))}

        {/* زرُّ الزائد في هيئة البطاقات لا زرًّا غريبًا عنها */}
        {canEdit && !adding && (
          <button type="button" className="kn-notebook kn-notebook-add" onClick={() => setAdding(true)}>
            <span className="kn-notebook-plus" aria-hidden="true">+</span>
            <span>كرّاسةٌ جديدة</span>
          </button>
        )}
      </div>

      {canEdit && adding && (
        <div className="kn-inline-form">
          <IconChoice value={icon} onChange={setIcon} label="الكرّاسة" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void add() }
              if (e.key === 'Escape') { e.preventDefault(); setAdding(false) }
            }}
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
    </section>
  )
}

// ----------------------------------------------------- صفحة الفائدة الواحدة
/**
 * الفائدةُ وحدها في صفحتها: نصُّها تامًّا لا يُطوى، وعزوُها، وما اتّصل بها
 * من فوائد — ما كان في كرّاساتها، وما خرج من كتابها، **وما شاركها في عَلَمٍ أو
 * وسمٍ أو باب**. **وههنا تُعلَّم نفاستُها** — بالنجوم في صدر بطاقتها — لا من
 * نموذجها.
 *
 * و**السابقةُ والتاليةُ تتبعان القائمةَ التي جاء منها القارئ** (`perks.trail`):
 * من رشّح بعَلَمٍ ثم فتح فائدةً مضى في فوائد ذلك العَلَم، ومن جاء من كرّاسةٍ
 * مضى فيها على ترتيبها. ومن جاء من رابطٍ منسوخ فعلى ترتيب التقييد.
 *
 * وتقبل بادئةَ المعرّف كما تقبله تامًّا، كصفحة الكتاب: الرابطُ المنسوخ
 * مختصَر.
 */
export function PerkPage({ perkId }: { perkId: string }) {
  const { perks, notebooks, bookById, authorById, settings, isOwner, canEdit } = useLibrary()
  const ready = useNeedPerks()
  const [editing, setEditing] = useState(false)
  const [trail] = useViewState<Trail>(TRAIL_KEY, NO_TRAIL)
  const { print, sheet } = usePrintJob()

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

  /**
   * ذواتُ الصلة: ما شاركها في عَلَمٍ — وهو أقوى الصلات — ثم في وسم، ثم في
   * باب. ولا يُعاد فيها ما عُرض في قسمَي الكرّاسة والكتاب، ويُذكر سببُ الصلة
   * تحت كلّ واحدة فيُعرف لِمَ جاءت.
   */
  const related = useMemo(() => {
    if (!perk) return []
    const seen = new Set([
      perk.id, ...kin.notebook.slice(0, 12).map((p) => p.id), ...kin.book.slice(0, 12).map((p) => p.id),
    ])
    const people = new Set(perk.people)
    const tags = new Set(perk.tags)
    const topics = new Set([...perk.categories, ...perk.sub_categories])
    return perks
      .filter((p) => !seen.has(p.id))
      .map((p) => {
        const sharedPeople = p.people.filter((x) => people.has(x))
        const sharedTags = p.tags.filter((x) => tags.has(x))
        const sharedTopics = [...p.categories, ...p.sub_categories].filter((x) => topics.has(x))
        return {
          p,
          why: [...sharedPeople, ...sharedTags.map((t) => `#${t}`), ...sharedTopics],
          score: sharedPeople.length * 3 + sharedTags.length * 2 + sharedTopics.length,
        }
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [perks, perk, kin])

  // السابقةُ والتاليةُ: من القائمة التي جاء منها القارئ إن كانت فيها، وإلّا
  // فعلى ترتيب التقييد — والفوائدُ تصل مرتَّبةً به
  const byId = useMemo(() => new Map(perks.map((p) => [p.id, p])), [perks])
  const fromTrail = !!perk && trail.ids.includes(perk.id)
  const seq = fromTrail
    ? trail.ids.filter((id) => byId.has(id))
    : perks.map((p) => p.id)
  const at = perk ? seq.indexOf(perk.id) : -1
  const prev = at > 0 ? byId.get(seq[at - 1]) : undefined
  const next = at >= 0 && at < seq.length - 1 ? byId.get(seq[at + 1]) : undefined

  if (!(isOwner || settings.visibility.perks) || !ready || !perk) {
    return (
      <main className="app-main kn-page">
        <BackButton label="العودة إلى الفوائد" onClick={() => goBack({ name: 'perks' })} />
        {(isOwner || settings.visibility.perks) && !ready ? <KnLoading /> : (
          <KnEmpty
            title="لم يُعثَر على هذه الفائدة"
            hint="قد تكون حُذفت، أو أنها غير ظاهرةٍ للزوار."
          />
        )}
      </main>
    )
  }

  const book = perk.book_id ? bookById(perk.book_id) : undefined
  const inNotebooks = notebooks.filter((n) => perk.notebook_ids.includes(n.id))
  const crumbTopic = perk.categories[0]

  function printIt() {
    if (!perk) return
    print(
      <PerkSheet
        title={perk.title || 'فائدة'}
        kicker="فائدةٌ من كنّاش المكتبة"
        entries={[{ kind: 'perk', perk, book, author: book ? authorById(book.author_id) : null }]}
        link={perkLink(perk.id, perks.map((p) => p.id))}
        single
      />,
    )
  }

  return (
    <main className="app-main kn-page kn-single">
      <nav className="kn-crumbs" aria-label="موضعُ الفائدة">
        <a {...linkTo({ name: 'perks' })}>الفوائد والمقتطفات</a>
        {crumbTopic && (
          <>
            <ChevronIcon size={12} />
            <a {...linkTo({ name: 'perks', pick: { field: 'category', value: crumbTopic } })}>
              {crumbTopic}
            </a>
          </>
        )}
        <ChevronIcon size={12} />
        <span aria-current="page">{perk.title || 'فائدة'}</span>
      </nav>

      <PerkCard
        perk={perk}
        full
        onEdit={canEdit ? () => setEditing(true) : undefined}
        onPrint={printIt}
      />

      {/* موضعُها من القائمة التي جاء منها القارئ: يُعرف أين هو وكم بقي */}
      {seq.length > 1 && (
        <p className="kn-pager-where">
          {fromTrail ? trail.label : 'على ترتيب التقييد'} — {formatNumber(at + 1)} من {formatNumber(seq.length)}
        </p>
      )}

      <div className="kn-pager">
        {prev ? (
          <a className="kn-pager-link" {...linkTo({ name: 'perk', id: prev.id })}>
            <span className="kn-pager-dir">→ السابقة</span>
            <span className="kn-pager-title">{perkName(prev, 60)}</span>
          </a>
        ) : <span className="kn-pager-void" />}
        {/* والوسطُ قائمٌ وإن لم تكن قرعة: الشبكةُ ثلاثةُ أعمدة، فلو سقط الأوسطُ
            وقعت «التالية» في عموده الضيّق فصارت زرًّا صغيرًا في وسط الصفحة
            وأختُها لوحٌ عريض — وذاك ما كان يُرى في كنّاشٍ فيه فائدتان */}
        {perks.length > 2 ? (
          <button
            type="button"
            className="kn-btn kn-btn-ghost"
            onClick={() => {
              const p = randomPerk(perks, perk.id)
              if (p) navigate({ name: 'perk', id: p.id })
            }}
          >
            <SuggestIcon size={15} />
            <span>بالقرعة</span>
          </button>
        ) : <span className="kn-pager-gap" />}
        {next ? (
          <a className="kn-pager-link kn-pager-next" {...linkTo({ name: 'perk', id: next.id })}>
            <span className="kn-pager-dir">التالية ←</span>
            <span className="kn-pager-title">{perkName(next, 60)}</span>
          </a>
        ) : <span className="kn-pager-void" />}
      </div>

      {kin.notebook.length > 0 && (
        <section className="kn-kin">
          <h2>
            {inNotebooks.length === 1
              ? `من كرّاسة «${inNotebooks[0].name}»`
              : 'من كرّاساتها'}
            <span>{countLabel(kin.notebook.length, PERKS_COUNT, 'الأخرى')}</span>
          </h2>
          <div className="kn-list">
            {kin.notebook.slice(0, 12).map((p) => <PerkCard key={p.id} perk={p} />)}
          </div>
        </section>
      )}

      {kin.book.length > 0 && book && (
        <section className="kn-kin">
          <h2>
            من «{book.title}»
            <span>{countLabel(kin.book.length, PERKS_COUNT, 'الأخرى')}</span>
          </h2>
          <div className="kn-list">
            {kin.book.slice(0, 12).map((p) => <PerkCard key={p.id} perk={p} hideSource />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="kn-kin">
          <h2>ذواتُ صلةٍ بها</h2>
          <ul className="kn-related">
            {related.map(({ p, why }) => (
              <li key={p.id}>
                <a {...linkTo({ name: 'perk', id: p.id })}>
                  <span className="kn-related-title">{perkName(p, 90)}</span>
                  <span className="kn-related-why">
                    {why.slice(0, 4).map((w) => <span key={w}>{w}</span>)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <PerkEditor key={perk.id} perk={perk} onClose={() => setEditing(false)} />
      )}
      {sheet}
    </main>
  )
}

// ----------------------------------------------------- صفحة الكرّاسة الواحدة
/**
 * الكرّاسةُ في صفحتها: اسمُها وأيقونتُها ووصفُها وما جُمع لها، **ومنها تُضاف
 * الفوائدُ الداخلة فيها**. والإضافةُ ههنا لا في نموذج الفائدة: الكرّاسةُ تقوم
 * بعد أن يجتمع لها شيء، فتُجمع إليها مما قُيِّد لا مما يُقيَّد.
 *
 * وهي عرضٌ حتى يُضغط القلم، كصفحتَي المؤلِّف والدار. **وللكرّاسة وصفٌ** يُكتب
 * — المسألةُ التي تُجمع لها، وحدودُها.
 *
 * **والكرّاسةُ بحثٌ مصغَّر**: تُرتَّب فوائدُها بيد صاحبها وتُقسَم فصولًا
 * (`layout`)، ويُعرض في صدرها فهرسُ فصولها، وتُطبع أو تُحفظ PDF، وتُنزَّل
 * مستندًا يفتحه «وورد» أو نصَّ Markdown — وكلُّ ذلك للزائر كما هو لصاحبها،
 * إلّا الترتيبَ فلصاحبها وحده.
 */
export function NotebookPage({ notebookId }: { notebookId: string }) {
  const {
    perks, notebooks, settings, isOwner, canEdit, run, bookById, authorById, perkIndex,
  } = useLibrary()
  const ready = useNeedPerks()
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [arranging, setArranging] = useState(false)
  const [query, setQuery] = useState('')
  const { print, sheet } = usePrintJob()

  const notebook = useMemo<Notebook | undefined>(
    () => notebooks.find((n) => n.id === notebookId)
      ?? notebooks.find((n) => n.id.startsWith(notebookId)),
    [notebooks, notebookId],
  )

  /** فوائدُها وفصولُها على ترتيبها */
  const items = useMemo(
    () => (notebook ? notebookEntries(notebook, perks) : []),
    [notebook, perks],
  )
  const inside = useMemo(
    () => items.flatMap((i) => (i.kind === 'perk' ? [i.perk] : [])),
    [items],
  )
  const headings = items.filter((i) => i.kind === 'heading').length

  /**
   * ما ليس فيها من الفوائد، يُبحث فيه بمعيار البحث في المكتبة نفسه — بلا
   * تشكيلٍ ولا تفريقٍ بين الهمزات — ومن نصوصه المُطبَّعة سلفًا.
   */
  const outside = useMemo(() => {
    if (!notebook) return []
    const rest = perks.filter((p) => !p.notebook_ids.includes(notebook.id))
    return (query.trim()
      ? filterPerks(rest, { ...EMPTY_FILTER, query }, bookById, perkIndex)
      : rest).slice(0, 40)
  }, [perks, notebook, query, bookById, perkIndex])

  const canSee = isOwner || settings.visibility.perks
  if (!canSee || !ready || !notebook) {
    return (
      <main className="app-main kn-page">
        <BackButton
          label="العودة إلى الكرّاسات"
          onClick={() => goBack({ name: 'perks', tab: 'notebooks' })}
        />
        {canSee && !ready ? <KnLoading /> : <KnEmpty title="لم يُعثَر على هذه الكرّاسة" />}
      </main>
    )
  }

  const setMembership = async (perk: Perk, inIt: boolean) => {
    const next = inIt
      ? [...perk.notebook_ids, notebook.id]
      : perk.notebook_ids.filter((n) => n !== notebook.id)
    await run(() => api.setPerkNotebooks(perk.id, next))
  }

  const update = (patch: { name?: string; note?: string; icon?: string }) =>
    void run(() => api.updateNotebook(notebook.id, patch))

  const ctx = { bookById, authorById }
  const keepTrail = () => rememberTrail(inside.map((p) => p.id), `كرّاسة «${notebook.name}»`)

  function printIt() {
    if (!notebook) return
    print(
      <PerkSheet
        title={notebook.name}
        note={notebook.note}
        kicker="كرّاسةٌ من كنّاش المكتبة"
        entries={items.map((i) => (i.kind === 'heading'
          ? i
          : {
            kind: 'perk' as const,
            perk: i.perk,
            book: i.perk.book_id ? bookById(i.perk.book_id) : undefined,
            author: (() => {
              const b = i.perk.book_id ? bookById(i.perk.book_id) : undefined
              return b ? authorById(b.author_id) : null
            })(),
          }))}
        link={`${window.location.origin}${window.location.pathname}#/notebook/${notebook.id}`}
      />,
    )
  }

  function download(kind: 'doc' | 'md') {
    if (!notebook) return
    if (kind === 'doc') {
      downloadBlob(
        new Blob(['\ufeff', notebookDoc(notebook, items, ctx)], { type: 'application/msword' }),
        fileName(notebook.name, 'doc'),
      )
    } else {
      downloadBlob(
        new Blob([notebookMarkdown(notebook, items, ctx)], { type: 'text/markdown;charset=utf-8' }),
        fileName(notebook.name, 'md'),
      )
    }
  }

  return (
    <main className="app-main kn-page">
      <nav className="kn-crumbs" aria-label="موضعُ الكرّاسة">
        <a {...linkTo({ name: 'perks' })}>الفوائد والمقتطفات</a>
        <ChevronIcon size={12} />
        <a {...linkTo({ name: 'perks', tab: 'notebooks' })}>الكرّاسات</a>
        <ChevronIcon size={12} />
        <span aria-current="page">{notebook.name}</span>
      </nav>

      <header className="kn-hero kn-hero-notebook">
        <div className="kn-hero-top">
          <span className="kn-hero-mark" aria-hidden="true">
            <Icon name={notebook.icon || 'notebook'} size={28} />
          </span>
          <div className="kn-hero-titles">
            {editing ? (
              <div className="kn-inline-form kn-inline-form-stack">
                <div className="kn-inline-form">
                  <IconChoice
                    value={notebook.icon}
                    label={notebook.name}
                    onChange={(icon) => update({ icon })}
                  />
                  <input
                    defaultValue={notebook.name}
                    onBlur={(e) => {
                      const name = e.target.value.trim()
                      // والاسمُ لا يُمحى: الحقلُ الفارغ يعود إلى ما كان
                      if (!name) e.target.value = notebook.name
                      else if (name !== notebook.name) update({ name })
                    }}
                    style={inputStyle}
                    aria-label="اسم الكرّاسة"
                  />
                </div>
                <textarea
                  defaultValue={notebook.note}
                  onBlur={(e) => {
                    const note = e.target.value.trim()
                    if (note !== notebook.note) update({ note })
                  }}
                  placeholder="وصفُ الكرّاسة: المسألةُ التي يُجمع لها، وحدودُها"
                  style={{ ...inputStyle, minHeight: 70, lineHeight: 1.9, resize: 'vertical' }}
                  aria-label="وصف الكرّاسة"
                />
              </div>
            ) : (
              <>
                <span className="kn-eyebrow">كرّاسة</span>
                <h1>{notebook.name}</h1>
                {notebook.note && <Prose text={notebook.note} className="kn-hero-note prose" />}
                <p>
                  {inside.length > 0
                    ? [
                      countLabel(inside.length, PERKS_COUNT, 'المجموعة فيها'),
                      headings > 0 && countLabel(headings, { noun: 'الفصول' }),
                    ].filter(Boolean).join(' — ') + '.'
                    : 'كرّاسةٌ خالية بعدُ. أضِفْ إليها ما يخصُّ مسألتَها من الفوائد.'}
                </p>
              </>
            )}
          </div>

          <div className="kn-hero-actions">
            {/* والتصديرُ للزائر كما هو لصاحبها: الكرّاسةُ بحثٌ يُقرأ ويُنقل */}
            {inside.length > 0 && !editing && !arranging && (
              <div className="kn-export" role="group" aria-label="تصدير الكرّاسة">
                <button type="button" className="kn-btn kn-btn-ghost kn-btn-sm" onClick={printIt}
                  title="اطبعها — ومن نافذة الطباعة تُحفظ PDF">
                  <PrinterIcon size={14} />
                  <span>طباعة / PDF</span>
                </button>
                <button type="button" className="kn-btn kn-btn-ghost kn-btn-sm" onClick={() => download('doc')}
                  title="مستندٌ يُفتح في «وورد» ويُحرَّر">
                  <DownloadIcon size={14} />
                  <span>وورد</span>
                </button>
                <button type="button" className="kn-btn kn-btn-ghost kn-btn-sm" onClick={() => download('md')}
                  title="نصُّ Markdown — للمدوّنة">
                  <DownloadIcon size={14} />
                  <span>Markdown</span>
                </button>
              </div>
            )}

            {canEdit && (editing ? (
              <button type="button" className="kn-btn kn-btn-primary" onClick={() => setEditing(false)}>
                تمّ
              </button>
            ) : !arranging && (
              <>
                <button
                  type="button"
                  className="kn-btn kn-btn-primary"
                  onClick={() => setPicking((v) => !v)}
                  aria-expanded={picking}
                >
                  {picking ? 'أغلِق الاختيار' : '+ أضِفْ فوائدَ إليها'}
                </button>
                {inside.length > 1 && (
                  <button
                    type="button"
                    className="kn-btn kn-btn-ghost"
                    onClick={() => { setArranging(true); setPicking(false) }}
                    title="رتِّب فوائدَها وقسِّمها فصولًا"
                  >
                    <ScrollIcon size={15} />
                    <span>رتِّبها</span>
                  </button>
                )}
                <button
                  type="button"
                  className="kn-btn kn-btn-icon"
                  onClick={() => setEditing(true)}
                  title="تعديل اسم الكرّاسة ووصفها وأيقونتها"
                  aria-label="تعديل الكرّاسة"
                >
                  <PencilIcon size={16} />
                </button>
                <button
                  type="button"
                  className="kn-btn kn-btn-icon kn-btn-danger"
                  onClick={() => {
                    // الحذفُ لا رجعةَ فيه، فيُستأذَن — ويُقال ما يقع بفوائدها
                    if (!window.confirm(
                      `حذفُ كرّاسة «${notebook.name}»؟ تخرج منها فوائدُها ولا تُحذف.`,
                    )) return
                    void run(async () => {
                      await api.deleteNotebook(notebook.id)
                      navigate({ name: 'perks', tab: 'notebooks' })
                    })
                  }}
                  title="حذف الكرّاسة — ولا تُحذف فوائدُها، وإنما تخرج منها"
                  aria-label="حذف الكرّاسة"
                >
                  <ClearIcon size={16} />
                </button>
              </>
            ))}
          </div>
        </div>

        {/* فهرسُ الفصول: يُعرض متى قُسمت الكرّاسةُ فصلين فأكثر */}
        {headings > 1 && !arranging && (
          <nav className="kn-toc" aria-label="فصول الكرّاسة">
            {items.map((item, i) => (item.kind === 'heading' ? (
              <button
                key={`toc${i}`}
                type="button"
                onClick={() => document.getElementById(`kn-ch-${i}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {item.text}
              </button>
            ) : null))}
          </nav>
        )}
      </header>

      {/* لوحُ الاختيار: الفوائدُ التي ليست فيها، تُضاف بضغطة */}
      {canEdit && picking && (
        <div className="kn-picker">
          <label className="kn-search kn-search-sm">
            <SearchIcon size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الفوائد لتُضيفها…"
              aria-label="ابحث في الفوائد"
              autoFocus
            />
          </label>
          <ul>
            {outside.map((p) => (
              <li key={p.id}>
                <span className="kn-picker-text">
                  <span className="kn-picker-title">{perkName(p, 90)}</span>
                  {p.kinds[0] && <span className="kn-picker-kind">{p.kinds.join('، ')}</span>}
                </span>
                <button type="button" className="kn-btn kn-btn-ghost" onClick={() => void setMembership(p, true)}>
                  + أضِفْها
                </button>
              </li>
            ))}
            {outside.length === 0 && <li className="kn-hint">لا فائدةَ خارجها تطابق.</li>}
          </ul>
        </div>
      )}

      {arranging ? (
        <Arrange
          items={items}
          onCancel={() => setArranging(false)}
          onSave={async (next) => {
            if (await run(() => api.updateNotebook(notebook.id, { layout: toLayout(next) }))) {
              setArranging(false)
            }
          }}
        />
      ) : inside.length === 0 ? (
        <KnEmpty title="لم يُجمع فيها شيءٌ بعد" />
      ) : (
        <div
          className="kn-list"
          onClickCapture={(e) => {
            if ((e.target as Element).closest('a[href*="/perk/"]')) keepTrail()
          }}
        >
          {items.map((item, i) => (item.kind === 'heading' ? (
            <h2 key={`h${i}`} id={`kn-ch-${i}`} className="kn-chapter">{item.text}</h2>
          ) : (
            <div key={item.perk.id} className="kn-notebook-item">
              <PerkCard perk={item.perk} />
              {canEdit && (
                <button
                  type="button"
                  className="kn-link-btn kn-notebook-drop"
                  onClick={() => void setMembership(item.perk, false)}
                  title="أخرِجْها من هذه الكرّاسة — ولا تُحذف الفائدة"
                >
                  <ClearIcon size={12} />
                  أخرِجْها من الكرّاسة
                </button>
              )}
            </div>
          )))}
        </div>
      )}
      {sheet}
    </main>
  )
}

/**
 * ترتيبُ الكرّاسة: الفوائدُ صفوفٌ مختصرة تُسحب أو تُنقل بالسهمين، وبينها عناوينُ
 * فصولٍ تُكتب وتُحذف. **ولا يُحفظ شيءٌ حتى يُضغط «احفظ الترتيب»**: الترتيبُ
 * عملٌ متّصل، ولو حُفظ مع كل نقلةٍ لتراجعت الصفحةُ تحت اليد.
 *
 * والسهمان مع السحب لا بدلَه: السحبُ لا يُبلغ بلوحة المفاتيح ولا يصلح على
 * الجوّال، والسهمان يصلحان في الحالين.
 */
function Arrange(
  { items, onCancel, onSave }: {
    items: NotebookItem[]
    onCancel: () => void
    onSave: (next: NotebookItem[]) => Promise<void>
  },
) {
  const [draft, setDraft] = useState<NotebookItem[]>(items)
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const move = (from: number, to: number) => setDraft((prev) => {
    if (to < 0 || to >= prev.length || from === to) return prev
    const next = [...prev]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  })

  const addHeading = (at: number) => setDraft((prev) => {
    const next = [...prev]
    next.splice(at, 0, { kind: 'heading', text: '' })
    return next
  })

  const setHeading = (at: number, text: string) =>
    setDraft((prev) => prev.map((it, i) => (i === at && it.kind === 'heading' ? { ...it, text } : it)))

  const dropHeading = (at: number) => setDraft((prev) => prev.filter((_, i) => i !== at))

  return (
    <section className="kn-arrange">
      <p className="kn-hint">
        اسحب الصفوفَ أو انقلها بالسهمين، وأضِف بينها عناوينَ فصول. ولا يُحفظ شيءٌ حتى
        تضغط «احفظ الترتيب».
      </p>

      <ol className="kn-arrange-list">
        {draft.map((item, i) => (
          <li
            key={item.kind === 'perk' ? item.perk.id : `h${i}`}
            className={[
              item.kind === 'heading' ? 'is-heading' : '',
              drag === i ? 'dragging' : '',
              over === i && drag !== null && drag !== i ? 'over' : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); setOver(i) }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              if (drag !== null) move(drag, i)
              setDrag(null)
              setOver(null)
            }}
            onDragEnd={() => { setDrag(null); setOver(null) }}
          >
            <span className="kn-arrange-grip" aria-hidden="true">⋮⋮</span>
            {item.kind === 'heading' ? (
              <input
                value={item.text}
                onChange={(e) => setHeading(i, e.target.value)}
                placeholder="عنوانُ الفصل"
                style={inputStyle}
                aria-label="عنوان الفصل"
                autoFocus={!item.text}
              />
            ) : (
              <span className="kn-arrange-title">{perkName(item.perk, 90)}</span>
            )}
            <span className="kn-arrange-tools">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                aria-label="انقله إلى أعلى" title="إلى أعلى">▲</button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === draft.length - 1}
                aria-label="انقله إلى أسفل" title="إلى أسفل">▼</button>
              <button type="button" onClick={() => addHeading(i)}
                title="أضِف عنوانَ فصلٍ قبله" aria-label="أضِف عنوان فصل قبله">+ فصل</button>
              {item.kind === 'heading' && (
                <button type="button" onClick={() => dropHeading(i)}
                  aria-label="احذف عنوان الفصل" title="احذف العنوان">
                  <ClearIcon size={11} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="kn-arrange-foot">
        <button type="button" className="kn-btn kn-btn-ghost" onClick={() => addHeading(draft.length)}>
          + فصلٌ في الآخر
        </button>
        <span className="kn-toolbar-gap" />
        <button type="button" className="kn-btn kn-btn-ghost" onClick={onCancel}>إلغاء</button>
        <button
          type="button"
          className="kn-btn kn-btn-primary"
          disabled={busy}
          onClick={async () => { setBusy(true); await onSave(draft); setBusy(false) }}
        >
          {busy ? 'يُحفَظ…' : 'احفظ الترتيب'}
        </button>
      </div>
    </section>
  )
}
