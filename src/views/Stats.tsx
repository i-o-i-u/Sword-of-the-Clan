// الإحصائيات (§٥-٧). كل رقمٍ هنا مشتقٌّ من مجموعة الكتب الظاهرة للقارئ،
// فالزائر لا تدخل في حسابه كتبٌ أُخفيت عنه.
//
// والصفحة ثلاث طبقات: أعدادٌ مفردة في بطاقات، ثم مفاخرُ المكتبة — أكثرُ
// عنوانٍ مجلَّدات وأغلى كتاب — ثم قوائمُ الأكثر والأقدم.
//
// وقاعدةٌ تجري على الصفحة كلِّها: **ما كان فارغًا لا يُعرض**. بطاقةٌ تقرأ
// صفرًا ليست خبرًا، وقائمةٌ بلا صفوفٍ حَشْو. فكلُّ بندٍ هنا مشروطٌ بوجوده.

import { useMemo, type ReactNode } from 'react'
import { useLibrary } from '../lib/library'
import { deathLabel, toHijriYear, yearLabel } from '../lib/hijri'
import {
  BOOKS_COUNT, VOLUMES_COUNT, countLabel, formatNumber, missingVolumesHeadline,
  roleGroupLabel, type Book,
} from '../lib/types'
import { navigate } from '../lib/router'
import {
  CalculatorIcon, CalendarIcon, CoinIcon, GlobeIcon, HourglassIcon, OpenBookIcon,
  OwnerIcon, PagesIcon, PressIcon, RiyalGlyph, ScrollIcon, TagIcon, VerifyIcon,
  VolumesIcon, cardStyle,
} from '../components/ui'

type Icon = (p: { size?: number }) => JSX.Element

/** بطاقة عددٍ مفرد */
interface Tile {
  key: string
  label: string
  value: string
  icon: Icon
  /** ما يُلحق بالرقم: رمز العملة ونحوه */
  suffix?: ReactNode
}

/** صفٌّ في قائمة الأكثر: اسمٌ وعددٌ ونسبةٌ من الأعلى */
interface Row {
  name: string
  count: number
  /** ما يُعرض بدل العدد حين لا يكون العدد هو المقصود */
  text?: string
  onClick?: () => void
}

export default function Stats() {
  const { books, publishers, authors, mainCategories, settings, isOwner } = useLibrary()

  // ما أُطفئ عن الزوار يُحذف من هنا أيضًا، فلا تبقى بطاقةٌ تقرأ صفرًا أبدًا
  const showValue = isOwner || settings.visibility.value
  const showStatus = isOwner || settings.visibility.status
  const showAuthorPages = isOwner || settings.visibility.authors

  const s = useMemo(() => {
    /** مجلَّدات الكتاب كما أُدخلت، بلا حدّ الأربعين الذي يخصّ عرض الرفّ */
    const volumesOfBook = (b: Book) => (b.single_volume ? 1 : Math.max(0, b.volumes ?? 0))
    const partsOfBook = (b: Book) => (b.single_part ? 1 : Math.max(0, b.parts ?? 0))

    const volumes = books.reduce((sum, b) => sum + volumesOfBook(b), 0)
    const parts = books.reduce((sum, b) => sum + partsOfBook(b), 0)
    const pages = books.reduce((sum, b) => sum + Math.max(0, b.pages ?? 0), 0)
    const totalValue = books.reduce((sum, b) => sum + Math.max(0, b.value ?? 0), 0)

    // متوسّط صفحات المجلَّد: يُقسَم ما عُرفت صفحاتُه على مجلَّداته وحدها،
    // فلا يُخفِّض المتوسّطَ كتابٌ لم تُكتب صفحاتُه بعد.
    const paged = books.filter((b) => (b.pages ?? 0) > 0)
    const pagedVolumes = paged.reduce((sum, b) => sum + Math.max(1, volumesOfBook(b)), 0)
    const pagedPages = paged.reduce((sum, b) => sum + (b.pages ?? 0), 0)
    const avgPages = pagedVolumes > 0 ? Math.round(pagedPages / pagedVolumes) : 0

    /** أصحاب كل صفة، بلا تكرار: الرجل الواحد يُحقِّق كتبًا فيُعدّ مرةً */
    const roleNames = new Map<string, Set<string>>()
    books.forEach((b) => (b.contributors ?? []).forEach((c) => {
      const name = c.name.trim()
      if (!name) return
      if (!roleNames.has(c.role)) roleNames.set(c.role, new Set())
      roleNames.get(c.role)!.add(name)
    }))

    /** يعدّ الكتب على مفتاحٍ يُستخرج من كل كتاب، ويرتّبها من الأكثر */
    const tally = (keyOf: (b: Book) => string): { name: string; count: number }[] => {
      const map = new Map<string, number>()
      books.forEach((b) => {
        const key = keyOf(b).trim()
        if (key) map.set(key, (map.get(key) ?? 0) + 1)
      })
      return [...map.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
    }

    const byAuthor = tally((b) => b.author_name)
    const byPlace = tally((b) => b.place)
    const byPublisher = tally((b) => b.publisher)
    const byCategory = tally((b) => b.category)

    // أكثر عنوانٍ مجلَّدات، وأغلى كتاب: واحدٌ لا قائمة، فهو مَفخَرةٌ لا جدول
    const mostVolumes = books
      .filter((b) => volumesOfBook(b) > 1)
      .sort((a, b) => volumesOfBook(b) - volumesOfBook(a))[0] ?? null
    const dearest = books
      .filter((b) => (b.value ?? 0) > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0] ?? null

    // أقدم الطبعات: بالسنة موحَّدةً هجريًّا، فلا يختلط الميلاديّ بالهجريّ
    const oldestPrints = books
      .filter((b) => b.year != null && !b.year_approx)
      .map((b) => ({ book: b, y: toHijriYear(b.year, b.year_era) ?? Infinity }))
      .filter((r) => Number.isFinite(r.y))
      .sort((a, b) => a.y - b.y)
      .slice(0, 5)

    // أقدم المؤلِّفين: من عُرفت وفاتُه وحده — والمعاصِرُ والمجهولُ يُؤخَّران
    const bookCountOf = new Map<string, number>()
    books.forEach((b) => {
      if (b.author_id) bookCountOf.set(b.author_id, (bookCountOf.get(b.author_id) ?? 0) + 1)
    })
    const oldestAuthors = authors
      .filter((a) => !a.alive && a.death != null)
      .map((a) => ({ author: a, y: toHijriYear(a.death, a.era) ?? Infinity }))
      .filter((r) => Number.isFinite(r.y))
      .sort((a, b) => a.y - b.y)
      .slice(0, 5)

    // دُور النشر والتصنيفات تُعدّ ممّا في الكتب نفسها، لا من جدوليهما: دارٌ
    // مسجَّلةٌ بلا كتاب ليست في المكتبة بعدُ.
    const publisherCount = byPublisher.length || publishers.length
    const categoryCount = byCategory.length || mainCategories.length

    // الكتبُ التي نقص من طبعتها مجلَّدٌ فأكثر: خبرٌ يعني الفاهرسَ وحده،
    // ويعني القارئَ أيضًا — فليس كلُّ ما في الرفّ تامًّا
    const incomplete = books.filter((b) => (b.missing_volumes ?? []).length > 0)
    const missingVolumeCount = incomplete
      .reduce((sum, b) => sum + (b.missing_volumes ?? []).length, 0)

    const read = books.filter((b) => b.status === 'مقروء').length
    const reading = books.filter((b) => b.status === 'قيد القراءة').length
    const unread = books.filter((b) => b.status === 'لم يُقرأ').length

    return {
      titles: books.length,
      volumes,
      parts,
      pages,
      avgPages,
      totalValue,
      roleNames,
      publisherCount,
      categoryCount,
      byAuthor,
      byPlace,
      byPublisher,
      byCategory,
      mostVolumes,
      mostVolumesCount: mostVolumes ? volumesOfBook(mostVolumes) : 0,
      dearest,
      oldestPrints,
      oldestAuthors,
      incomplete,
      missingVolumeCount,
      bookCountOf,
      read, reading, unread,
      statusTotal: read + reading + unread,
    }
  }, [books, authors, publishers, mainCategories])

  // ------------------------------------------------------------ البطاقات
  const tiles: Tile[] = []
  const push = (t: Tile) => { if (t.value) tiles.push(t) }
  const num = (n: number) => (n > 0 ? formatNumber(n) : '')

  push({ key: 'titles', label: 'عناوين الكتب', value: num(s.titles), icon: OpenBookIcon })
  push({ key: 'volumes', label: 'المُجلَّدات', value: num(s.volumes), icon: VolumesIcon })
  push({ key: 'parts', label: 'الأَجْزاء أو الأَسْفار', value: num(s.parts), icon: ScrollIcon })

  // لكلّ صفةٍ بطاقتُها، بترتيب ورودها في قائمة الصفات لا بعدد أصحابها
  s.roleNames.forEach((names, role) => {
    push({
      key: `role-${role}`,
      label: roleGroupLabel(role),
      value: num(names.size),
      icon: VerifyIcon,
    })
  })

  push({ key: 'publishers', label: 'دُوْر النَّشْر', value: num(s.publisherCount), icon: PressIcon })
  push({ key: 'categories', label: 'التصنيفات', value: num(s.categoryCount), icon: TagIcon })
  push({
    key: 'avg',
    label: 'متوسّط صفحات المُجلَّد',
    value: num(s.avgPages),
    icon: CalculatorIcon,
  })
  push({ key: 'pages', label: 'إجماليّ صفحات الكتب', value: num(s.pages), icon: PagesIcon })
  // ما كان فارغًا لا يُعرض: مكتبةٌ لا نقص فيها لا تُعلَن بصفرٍ في بطاقة
  push({
    key: 'incomplete',
    label: 'الكتب الناقصة مُجلَّداتُها',
    value: num(s.incomplete.length),
    icon: VolumesIcon,
  })
  if (showValue) {
    push({
      key: 'value',
      label: 'القيمة التقديرية',
      value: num(s.totalValue),
      icon: CoinIcon,
      suffix: settings.currency === 'ريال'
        ? <RiyalGlyph />
        : <span style={{ fontSize: 12 }}>({settings.currency})</span>,
    })
  }

  const goBook = (id: string) => () => navigate({ name: 'book', id })

  return (
    <main className="app-main stats-main">
      <header className="stats-head">
        <h1>إحصائيات مكتبة سَيْف العشيرة</h1>
        <p>
          {s.titles === 0
            ? 'لم يُفهرَس كتابٌ بعد، فلا أرقام.'
            : `أرقامُ المكتبة كما هي اليوم: ${countLabel(s.titles, BOOKS_COUNT)}`
              + `، و${countLabel(s.volumes, VOLUMES_COUNT)}.`}
        </p>
      </header>

      {tiles.length > 0 && (
        <section className="stats-tiles">
          {tiles.map(({ key, label, value, icon: Icon, suffix }) => (
            <div key={key} className="stat-tile">
              <span className="stat-tile-icon" aria-hidden="true"><Icon size={17} /></span>
              <span className="stat-tile-value">
                {value}
                {suffix && <span className="stat-tile-suffix">{suffix}</span>}
              </span>
              <span className="stat-tile-label">{label}</span>
            </div>
          ))}
        </section>
      )}

      {/* ------------------------------------------------------- المفاخر */}
      <section className="stats-highlights">
        {s.mostVolumes && (
          <Highlight
            icon={<VolumesIcon size={18} />}
            title="أكثرُ عنوانٍ مُجلَّدات"
            name={s.mostVolumes.title}
            note={countLabel(s.mostVolumesCount, VOLUMES_COUNT)}
            onClick={goBook(s.mostVolumes.id)}
          />
        )}
        {showValue && s.dearest && (
          <Highlight
            icon={<CoinIcon size={18} />}
            title="أغلى كتابٍ في المكتبة"
            name={s.dearest.title}
            note={`${formatNumber(s.dearest.value ?? 0)} ${settings.currency}`}
            onClick={goBook(s.dearest.id)}
          />
        )}
        {s.byCategory[0] && (
          <Highlight
            icon={<TagIcon size={18} />}
            title="أكثرُ التصنيفات كتبًا"
            name={s.byCategory[0].name}
            note={countLabel(s.byCategory[0].count, BOOKS_COUNT)}
          />
        )}
      </section>

      {/* -------------------------------------------------- قوائم الأكثر */}
      <section className="stats-lists">
        <BarCard
          title="أكثر خمسةِ مؤلِّفين كتبًا"
          icon={<OwnerIcon size={17} />}
          rows={s.byAuthor.slice(0, 5)}
        />
        <BarCard
          title="أكثر خمسةِ بلدانٍ نشرًا"
          icon={<GlobeIcon size={17} />}
          rows={s.byPlace.slice(0, 5)}
        />
        <BarCard
          title="أكثر خمسِ دُورٍ نشرًا"
          icon={<PressIcon size={17} />}
          rows={s.byPublisher.slice(0, 5)}
        />

        <RankCard
          title="أقدمُ خمسِ طبعات"
          icon={<CalendarIcon size={17} />}
          rows={s.oldestPrints.map(({ book }) => ({
            name: book.title,
            count: 0,
            text: yearLabel(book.year, book.year_era),
            onClick: goBook(book.id),
          }))}
        />
        {/* الناقصةُ مجلَّداتُها: قائمةٌ لا بطاقةَ عددٍ وحدها، فمعرفةُ أيِّها
            ناقصٌ أنفعُ من معرفة كم هي */}
        <RankCard
          title="الكتب الناقصة مُجلَّداتُها"
          icon={<VolumesIcon size={17} />}
          rows={s.incomplete.slice(0, 5).map((book) => ({
            name: book.title,
            count: 0,
            text: missingVolumesHeadline((book.missing_volumes ?? []).length),
            onClick: goBook(book.id),
          }))}
        />
        <RankCard
          title="أقدمُ خمسةِ مؤلِّفين"
          icon={<HourglassIcon size={17} />}
          rows={s.oldestAuthors.map(({ author }) => ({
            name: author.name,
            count: s.bookCountOf.get(author.id) ?? 0,
            text: deathLabel(author),
            onClick: showAuthorPages
              ? () => navigate({ name: 'author', id: author.id })
              : undefined,
          }))}
        />
      </section>

      {/* حالة القراءة: ليست من عدّ الفهرس، فهي في ذيل الصفحة لا في صدرها */}
      {showStatus && s.statusTotal > 0 && (
        <section className="stats-status">
          <div className="stats-card-head">
            <span className="stats-card-icon" aria-hidden="true"><OpenBookIcon size={17} /></span>
            حالة القراءة
          </div>
          <div className="stats-bar">
            <span style={{ background: 'oklch(0.5 0.08 150)', width: pct(s.read, s.statusTotal) }} />
            <span style={{ background: 'var(--star)', width: pct(s.reading, s.statusTotal) }} />
            <span style={{ background: 'oklch(0.7 0.01 60)', width: pct(s.unread, s.statusTotal) }} />
          </div>
          <div className="stats-legend">
            <span>● مقروءة ({formatNumber(s.read)})</span>
            <span>● قيد القراءة ({formatNumber(s.reading)})</span>
            <span>● لم يُقرأ ({formatNumber(s.unread)})</span>
          </div>
        </section>
      )}
    </main>
  )
}

const pct = (n: number, total: number) => `${total > 0 ? Math.round((n / total) * 100) : 0}%`

/** مَفخَرةٌ مفردة: كتابٌ أو تصنيفٌ واحد، لا قائمة */
function Highlight(
  { icon, title, name, note, onClick }:
  { icon: ReactNode; title: string; name: string; note: string; onClick?: () => void },
) {
  return (
    <div
      className={`stat-highlight${onClick ? ' stat-highlight-link' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={cardStyle}
    >
      <span className="stat-highlight-icon" aria-hidden="true">{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className="stat-highlight-title">{title}</div>
        <div className="stat-highlight-name">{name}</div>
        <div className="stat-highlight-note">{note}</div>
      </div>
    </div>
  )
}

/** قائمةٌ بأعمدةٍ نسبيّة: طولُ العمود من أعلى الصفوف لا من مجموع المكتبة */
function BarCard({ title, icon, rows }: { title: string; icon: ReactNode; rows: Row[] }) {
  if (rows.length === 0) return null
  const top = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="stats-card" style={cardStyle}>
      <div className="stats-card-head">
        <span className="stats-card-icon" aria-hidden="true">{icon}</span>
        {title}
      </div>
      {rows.map((row) => (
        <div key={row.name} className="stats-row">
          <div className="stats-row-head">
            <span className="stats-row-name">{row.name}</span>
            <span className="stats-row-count">{countLabel(row.count, BOOKS_COUNT)}</span>
          </div>
          <div className="stats-track">
            <span style={{ width: `${Math.round((row.count / top) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** قائمةٌ مرتَّبة بأرقامها: الأقدم فالأقدم، ولكلٍّ خبرُه عن يساره */
function RankCard({ title, icon, rows }: { title: string; icon: ReactNode; rows: Row[] }) {
  if (rows.length === 0) return null

  return (
    <div className="stats-card" style={cardStyle}>
      <div className="stats-card-head">
        <span className="stats-card-icon" aria-hidden="true">{icon}</span>
        {title}
      </div>
      <ol className="stats-rank">
        {rows.map((row, i) => (
          <li
            key={`${row.name}-${i}`}
            className={row.onClick ? 'stats-rank-link' : undefined}
            onClick={row.onClick}
          >
            <span className="stats-rank-no">{formatNumber(i + 1)}</span>
            <span className="stats-rank-name">{row.name}</span>
            <span className="stats-rank-note">{row.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
