// «الفوائد والمقتطفات»: كنّاشُ المكتبة.
//
// وهو بابٌ ذو أبواب، لا صفحةً واحدة تُسرَد فيها الفوائدُ تحت عناوين كتبها
// كما كان. فالقيدُ لا يُطلب من جهةٍ واحدة: يُطلب من بابه، ومن العَلَم الذي
// ذُكر فيه، ومن الكرّاسة التي جُمع لها، ومن الكتاب الذي خرج منه — ولكلِّ
// طالبٍ بابُه:
//
//   • السَّيْل     — القيود كلُّها، تُصفَّى وتُرتَّب وتُقرأ بثلاث طرائق.
//   • الأبواب    — أبوابُ العلم التي تتوزّع عليها، ومعها فروعُها.
//   • الأعلام    — كلُّ عَلَمٍ ذُكر في قيدٍ، يجتمع به ما تفرَّق عنه.
//   • الكرّاسات  — قيودٌ متفرِّقة جُمعت حول مسألةٍ واحدة فصارت بحثًا مصغَّرًا.
//   • النفائس   — ما بلغ من القيود النجومَ الثلاث، وهي خلاصةُ الكنّاش.
//
// ولكلّ بابٍ موضعُه من الرابط (`#/perks/topics`) فيُشارَك ويُعاد إليه، ولكلّ
// قيدٍ صفحتُه (`#/perk/:id`).
//
// وما حجبه الخادم عن الزائر لا يصل هذه الصفحة أصلًا: قيودُ الكتاب المخفيّ
// لا تُرسَل، ومفتاحُ «الفوائد والمقتطفات» في تبويب الزوار يُسقطها كلَّها.

import { useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import {
  EMPTY_FILTER, PERK_SORTS, filterIsOn, filterPerks, perkDate, perkNotebooks,
  perkPeople, perkSources, perkTags, perkTopics, sortPerks, sourceTitle,
  type PerkFilter, type PerkSort, type Tally,
} from '../lib/perks'
import {
  PERKS_COUNT, countLabel, formatNumber, perkKindsOf, type Perk,
} from '../lib/types'
import PerkCard from '../components/PerkCard'
import Prose from '../components/Prose'
import PerkEditor from '../components/PerkEditor'
import PerkSettings from '../components/PerkSettings'
import {
  BackButton, ClearIcon, EmptyState, GearIcon, GridIcon, HashIcon, OpenBookIcon,
  OwnerIcon, PerkIcon, ScrollIcon, SearchIcon, TableIcon, VerifyIcon,
  facetStyle, viewToggleStyle,
} from '../components/ui'

/** أبوابُ الكنّاش. المفتاحُ موضعُه من الرابط، والصدرُ بلا مفتاح. */
const TABS = [
  { key: '', label: 'السَّيْل', icon: ScrollIcon },
  { key: 'topics', label: 'الأبواب', icon: GridIcon },
  { key: 'people', label: 'الأعلام', icon: OwnerIcon },
  { key: 'notebooks', label: 'الكرّاسات', icon: OpenBookIcon },
  { key: 'gems', label: 'النفائس', icon: VerifyIcon },
] as const

/** طرائقُ قراءة السيل: بطاقاتٌ مفصَّلة، أو فهرسٌ يُمسح بالعين، أو نصٌّ متّصل */
const VIEWS = [
  { key: 'cards', label: 'بطاقات', icon: GridIcon },
  { key: 'index', label: 'فهرس', icon: TableIcon },
  { key: 'reading', label: 'مطالعة متّصلة', icon: ScrollIcon },
] as const

type ViewKey = typeof VIEWS[number]['key']

export default function Perks({ tab = '' }: { tab?: string }) {
  const { perks, bookById, settings, isOwner, canEdit } = useLibrary()
  const canSee = isOwner || settings.visibility.perks

  const [filter, setFilter] = useState<PerkFilter>(EMPTY_FILTER)
  const [sort, setSort] = useState<PerkSort>('newest')
  const [view, setView] = useState<ViewKey>('cards')
  const [editing, setEditing] = useState<Perk | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)

  /** الأنواع كما حرّرها صاحب المكتبة، ومعها ما بقي في القيود من نوعٍ رُفع */
  const kinds = useMemo(() => perkKindsOf(settings, perks), [settings, perks])

  /**
   * ينتقل إلى السيل ويُصفِّيه بما ضُغط عليه، من أيّ بابٍ كان: عَلَمًا في
   * «الأعلام»، أو كرّاسةً في «الكرّاسات»، أو رُقعةً على بطاقة قيد.
   *
   * والترشيحُ يُوضَع قبل الانتقال ولا يُخلى بعده: إخلاؤه إنما يكون بضغط
   * القارئ على بابٍ من التبويب — وذلك في `openTab` — لا بمجرَّد تبدُّل
   * المسار، وإلّا محا هذا ما وضعه ذاك.
   */
  function pick(field: keyof PerkFilter, value: string | number) {
    setFilter({ ...EMPTY_FILTER, [field]: value })
    if (tab) navigate({ name: 'perks' })
  }

  /** بابٌ يُفتح من التبويب: يُخلي الترشيحَ — البابُ نفسُه ترشيحٌ قائم */
  function openTab(key: string) {
    setFilter(EMPTY_FILTER)
    navigate(key ? { name: 'perks', tab: key } : { name: 'perks' })
  }

  const topics = useMemo(() => perkTopics(perks), [perks])
  const people = useMemo(() => perkPeople(perks), [perks])
  const notebooks = useMemo(() => perkNotebooks(perks), [perks])
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
        وأعدادَه، وأبوابَه الخمسة، وأدواتِ صاحبه — القيدَ الجديد وإعداداتِ
        الأنواع.
      */}
      <header className="kunnash-head">
        <div className="kunnash-brand">
          <span className="kunnash-mark" aria-hidden="true"><PerkIcon size={26} /></span>
          <div className="kunnash-name">
            <h1>الفوائد والمقتطفات</h1>
            <p>
              كنّاشُ المكتبة: ما قُيِّد من كتبها ومن غيرها — فائدةً استُنبطت،
              أو نصًّا نُقل، أو تعقُّبًا على قول.
            </p>
          </div>

          {canEdit && (
            <div className="kunnash-tools">
              <button type="button" className="perks-new" onClick={() => setEditing(null)}>
                + قيدٌ جديد
              </button>
              <button
                type="button"
                className="kunnash-gear"
                onClick={() => setSettingsOpen(true)}
                title="إعدادات الكنّاش — أنواع القيد"
                aria-label="إعدادات الكنّاش"
              >
                <GearIcon size={18} />
              </button>
            </div>
          )}
        </div>

        {canSee && perks.length > 0 && (
          <>
            <div className="perks-tally">
              <Tile value={perks.length} label="قيدًا" />
              <Tile value={sources.length} label="كتابًا أفاد" />
              <Tile value={topics.length} label="بابًا" />
              <Tile value={people.length} label="عَلَمًا" />
              <Tile value={gems.length} label="من النفائس" />
            </div>

            <nav className="perks-tabs" aria-label="أبواب الكنّاش">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key || 'feed'}
                  type="button"
                  className={key === tab ? 'perks-tab perks-tab-on' : 'perks-tab'}
                  onClick={() => openTab(key)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}
      </header>

      {!canSee ? (
        <EmptyState title="الفوائد والمقتطفات غير معروضة" />
      ) : perks.length === 0 ? (
        <EmptyState
          title="لم يُقيَّد شيءٌ بعد"
          hint={canEdit
            ? 'ابدأ بقيدٍ واحد: اضغط «قيدٌ جديد»، أو قيِّده من صفحة كتابه.'
            : 'تُسجَّل الفائدةُ من صفحة الكتاب الذي استُخرجت منه.'}
        />
      ) : (
        <>
          {(tab === '' || tab === 'gems') && (
            <Feed
              perks={shown}
              total={tab === 'gems' ? gems.length : perks.length}
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
              emptyTitle={tab === 'gems' ? 'لم يُوسَم قيدٌ بالنجوم الثلاث بعد' : 'لا مطابق'}
            />
          )}

          {tab === 'topics' && (
            <TallyGrid
              rows={topics}
              hint="أبوابُ العلم التي تتوزّع عليها القيود، ومعها فروعُها. وهي تصنيفاتُ المكتبة نفسها، تُحرَّر من نافذة الإعدادات."
              onPick={(name) => pick('category', name)}
              onPickChild={(name) => pick('subCategory', name)}
              empty="لم يُنسَب قيدٌ إلى بابٍ بعد."
            />
          )}

          {tab === 'people' && (
            <TallyGrid
              rows={people}
              hint="كلُّ عَلَمٍ ذُكر في قيدٍ. واضغط الاسمَ يجتمع لك ما يتعلَّق به وحده."
              onPick={(name) => pick('person', name)}
              empty="لم يُذكر عَلَمٌ في قيدٍ بعد."
            />
          )}

          {tab === 'notebooks' && (
            <TallyGrid
              rows={notebooks}
              hint="قيودٌ متفرِّقة جُمعت حول مسألةٍ واحدة فصارت بحثًا مصغَّرًا. وهي ثمرةُ الكنّاش لا مجرَّدَ تصنيف."
              onPick={(name) => pick('notebook', name)}
              empty="لم تُفتح كرّاسةٌ بعد. تُفتح بكتابة اسمها في قيدٍ."
            />
          )}
        </>
      )}

      {editing !== undefined && (
        <PerkEditor perk={editing} onClose={() => setEditing(undefined)} />
      )}
      {settingsOpen && <PerkSettings onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}

// ---------------------------------------------------------------- السَّيْل
function Feed(
  { perks, total, filter, setFilter, sort, setSort, view, setView, topics, tags,
    kinds, onEdit, onPick, emptyTitle }: {
    perks: Perk[]
    total: number
    filter: PerkFilter
    setFilter: (f: PerkFilter) => void
    sort: PerkSort
    setSort: (s: PerkSort) => void
    view: ViewKey
    setView: (v: ViewKey) => void
    topics: Tally[]
    tags: Tally[]
    kinds: string[]
    onEdit?: (perk: Perk) => void
    onPick: (field: keyof PerkFilter, value: string | number) => void
    emptyTitle: string
  },
) {
  const { bookById } = useLibrary()
  const on = filterIsOn(filter)

  return (
    <>
      <div className="perks-bar">
        <div className="perks-search">
          <SearchIcon size={16} />
          <input
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            placeholder="ابحث في القيود: نصًّا، أو عنوانًا، أو عَلَمًا، أو اسم كتاب…"
            aria-label="ابحث في القيود"
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
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              title={label}
              aria-label={label}
              style={viewToggleStyle(view === key)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="perks-facets">
        {/* النوع: كلُّ نوعٍ رُقعة، والمضغوطةُ تُرفع بضغطةٍ ثانية */}
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter({ ...filter, kind: filter.kind === k ? '' : k })}
            style={facetStyle(filter.kind === k)}
          >
            {k}
          </button>
        ))}

        <span className="perks-facet-gap" />

        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value, subCategory: '' })}
          className="perks-select"
          aria-label="الباب"
        >
          <option value="">كلّ الأبواب</option>
          {topics.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

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

      {/* الوسومُ صفٌّ تحت المُصفِّيات: هي أسرعُ ما يُطلب به القيد */}
      {tags.length > 0 && (
        <div className="perks-tagline">
          {tags.slice(0, 18).map((t) => (
            <button
              key={t.name}
              type="button"
              className={filter.tag === t.name ? 'perk-tag perk-tag-on' : 'perk-tag'}
              // الرُّقعةُ ههنا تُبدَّل وحدَها ولا تمحو ما سواها: القارئُ قد
              // كتب بحثًا واختار بابًا، فليس رفعُ وسمٍ رفعًا لعمله كلِّه
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

      <div className="perks-count">
        {on && (
          <button type="button" className="perks-clear" onClick={() => setFilter(EMPTY_FILTER)}>
            <ClearIcon size={12} />
            ارفع الترشيح
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
                <span className="perk-index-kind">{p.kind}</span>
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
        /* مطالعةٌ متّصلة: النصوصُ وحدها يتلو بعضُها بعضًا كصفحةِ كتاب، ولكلٍّ
           عزوُه تحته. لمن أراد أن يقرأ الكنّاش لا أن يبحث فيه. */
        <div className="perk-reading">
          {perks.map((p) => (
            <section key={p.id}>
              {p.title && <h3>{p.title}</h3>}
              <Prose text={p.text} />
              <footer>
                <button type="button" onClick={() => navigate({ name: 'perk', id: p.id })}>
                  {sourceTitle(p, p.book_id ? bookById(p.book_id) : undefined) || 'القيد'}
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

// ------------------------------------------------------- الأبواب والأعلام
/** شبكةُ أسماءٍ بأعدادها: بها تُعرض الأبوابُ والأعلامُ والكرّاسات جميعًا */
function TallyGrid(
  { rows, hint, onPick, onPickChild, empty }: {
    rows: Tally[]
    hint: string
    onPick: (name: string) => void
    onPickChild?: (name: string) => void
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
            <button type="button" className="tally-head" onClick={() => onPick(row.name)}>
              <span className="tally-name">{row.name}</span>
              <span className="tally-count">{countLabel(row.count, PERKS_COUNT)}</span>
            </button>

            {row.children && row.children.length > 0 && (
              <div className="tally-kids">
                {row.children.map((kid) => (
                  <button
                    key={kid.name}
                    type="button"
                    onClick={() => (onPickChild ?? onPick)(kid.name)}
                  >
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

/** لوحُ عددٍ مفرد في صدر الصفحة. وما كان صفرًا لا يُعرض — ليس خبرًا. */
function Tile({ value, label }: { value: number; label: string }) {
  if (value <= 0) return null
  return (
    <div className="perks-tile">
      <span className="perks-tile-value">{formatNumber(value)}</span>
      <span className="perks-tile-label">{label}</span>
    </div>
  )
}

// ------------------------------------------------------- صفحة القيد الواحد
/**
 * القيدُ وحده في صفحته: نصُّه تامًّا لا يُطوى، وعزوُه، وما اتّصل به من قيود —
 * ما كان في كرّاسته، وما خرج من كتابه.
 *
 * وتقبل بادئةَ المعرّف كما تقبله تامًّا، كصفحة الكتاب: الرابطُ المنسوخ
 * مختصَر.
 */
export function PerkPage({ perkId }: { perkId: string }) {
  const { perks, bookById, settings, isOwner, canEdit } = useLibrary()
  const [editing, setEditing] = useState(false)

  const perk = useMemo(
    () => perks.find((p) => p.id === perkId) ?? perks.find((p) => p.id.startsWith(perkId)),
    [perks, perkId],
  )

  const kin = useMemo(() => {
    if (!perk) return { notebook: [] as Perk[], book: [] as Perk[] }
    return {
      notebook: perk.notebook
        ? perks.filter((p) => p.id !== perk.id && p.notebook === perk.notebook)
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
          title="لم يُعثَر على هذا القيد"
          hint="قد يكون حُذف، أو أنه غير ظاهرٍ للزوار."
        />
      </main>
    )
  }

  const book = perk.book_id ? bookById(perk.book_id) : undefined

  return (
    <main className="app-main perks-page perk-single">
      <BackButton label="العودة إلى الفوائد" onClick={() => navigate({ name: 'perks' })} />

      <PerkCard perk={perk} full onEdit={canEdit ? () => setEditing(true) : undefined} />

      {kin.notebook.length > 0 && (
        <section className="perk-kin">
          <h2>
            من كرّاسة «{perk.notebook}»
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

      {editing && <PerkEditor perk={perk} onClose={() => setEditing(false)} />}
    </main>
  )
}
