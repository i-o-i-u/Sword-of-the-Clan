// الترويسة الملتصقة أعلى الصفحة: الشعار واسم المكتبة، ثم حقل البحث السريع،
// ثم تبويبات التنقّل بأيقوناتها، وفي الطرف الأيسر تبديل المظهر والإعدادات.
//
// لا زرَّ لدخول صاحب المكتبة هنا: مدخله مخفيٌّ في صورة صفحة الهبوط
// (ثلاث نقراتٍ عليها)، فلا يرى الزائر بابًا لا يخصّه.
//
// والتبويباتُ روابطُ لا أزرار: تُفتح في لسانٍ جديد بالزرّ الأوسط، ويُعلَم
// المختارُ منها بـ`aria-current` فيقرؤه قارئُ الشاشة.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLibrary } from '../lib/library'
import { linkTo, type Route } from '../lib/router'
import { THEME_LABELS } from '../lib/theme'
import { LIBRARY_NAME } from '../lib/types'
import {
  BookPlusIcon, BooksIcon, GearIcon, HomeIcon, LibraryIcon, MoonIcon, PerkIcon,
  PressIcon, QuillIcon, SearchIcon, SunIcon, resolveAsset,
} from './ui'

interface Props {
  route: Route
  onOpenSearch: (query?: string) => void
  onOpenSettings: () => void
}

export default function Header({ route, onOpenSearch, onOpenSettings }: Props) {
  const { isOwner, canEdit, settings, cycleTheme } = useLibrary()
  const [quick, setQuick] = useState('')
  const ref = useRef<HTMLElement>(null)

  const vis = settings.visibility
  const showAuthorsTab = isOwner || vis.authors
  const showPerksTab = isOwner || vis.perks

  const onBrowse = route.name === 'browse' || route.name === 'book'
  const onAuthors = route.name === 'authors' || route.name === 'author'

  // في صفحة الهبوط تنتقل أدوات صاحب المكتبة إلى الصفحة نفسها: «إضافة كتاب»
  // إلى أزرار الإطار، واسمُه وأدواتُه إلى الفراغ عن يمين الصورة. فلا تُعاد
  // هنا مرّتين.
  const onLanding = route.name === 'landing'

  // ارتفاعُ الرأس يُقاس ويُكتب في `--header-h`: عليه تلتصق ترويسةُ الجدول
  // وعمودُ التصفُّح تحته، ومنه يُطرح ارتفاعُ الهبوط. وكان ثابتًا في ملف
  // الأنماط (٧٠) والرأسُ يلتفّ صفَّين وثلاثةً على الشاشات الأضيق.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver !== 'function') return
    const root = document.documentElement
    const write = () => {
      // في المقاس المكبَّر بـ`zoom` يُقاس الرأسُ بوحدات الصفحة المكبَّرة نفسها
      const scale = parseFloat(getComputedStyle(root).getPropertyValue('--ui-scale')) || 1
      root.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height / scale)}px`)
    }
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** حقل البحث يسلّم ما كُتب فيه إلى لوحة البحث ثم يفرغ */
  function submitQuick(e: FormEvent) {
    e.preventDefault()
    onOpenSearch(quick.trim() || undefined)
    setQuick('')
  }

  return (
    /* علامةُ الرأس المزدحم: صاحبُ المكتبة يرى فوق ما يراه الزائرُ أربعةَ
       عناصر — اسمَه، ووضعَ التصفُّح، والخروجَ، وإضافةَ كتاب — فلا يسعه من
       العرض ما يسع الزائرَ. وبها يلتفّ الرأسُ عنده قبل أن يلتفّ عنده. */
    <header ref={ref} className="app-header" data-owner={isOwner && !onLanding ? '' : undefined}>
      <a className="brand" {...linkTo({ name: 'landing' })} aria-label={`${LIBRARY_NAME} — الصفحة الأولى`}>
        <span className="brand-badge">
          <img src={resolveAsset('assets/logo.svg') ?? ''} alt="" />
        </span>
        <span className="brand-name">{LIBRARY_NAME}</span>
      </a>

      <form className="quick-search" onSubmit={submitQuick} role="search">
        <SearchIcon size={15} />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="بحثٌ سريع…"
          aria-label="بحث سريع في المكتبة"
        />
      </form>

      <nav className="head-nav" aria-label="أبواب المكتبة">
        <Tab to={{ name: 'landing' }} on={route.name === 'landing'} icon={<HomeIcon size={17} />}>
          الصفحة الأولى
        </Tab>

        <Tab to={{ name: 'browse' }} on={onBrowse} icon={<BooksIcon size={17} />}>
          {/* اسمُه دعوةٌ ما دمتَ خارجها، فإذا صرتَ فيها صار وصفًا لما تفعل */}
          {onBrowse ? 'تصفُّح المكتبة' : 'الدخول إلى المكتبة'}
        </Tab>

        {showAuthorsTab && (
          <Tab to={{ name: 'authors' }} on={onAuthors} icon={<QuillIcon size={17} />}>
            المؤلِّفون
          </Tab>
        )}

        <Tab
          to={{ name: 'publishers' }}
          on={route.name === 'publishers' || route.name === 'publisher'}
          icon={<PressIcon size={17} />}
        >
          دُوْر النَّشْر
        </Tab>

        {/* «الفوائد» بابٌ من أبواب الموقع لا صفحةً جانبيّة: قسمٌ قائمٌ
            بنفسه له ترويستُه وأبوابُه، فمدخلُه من هنا كسائر الأقسام.
            واسمُه في الرأس «الفوائد» اختصارًا — والاسمُ التامّ في صدره. */}
        {showPerksTab && (
          <Tab
            to={{ name: 'perks' }}
            on={route.name === 'perks' || route.name === 'perk' || route.name === 'notebook'}
            icon={<PerkIcon size={17} />}
          >
            الفوائد
          </Tab>
        )}

        <Tab
          to={{ name: 'about' }}
          on={route.name === 'about' || route.name === 'stats'}
          icon={<LibraryIcon size={17} />}
        >
          عن المكتبة
        </Tab>

        {/* الإحصائيات لم تعد في الرأس — مدخلها من داخل «عن المكتبة» */}
        {canEdit && !onLanding && (
          <Tab to={{ name: 'add' }} on={route.name === 'add'} icon={<BookPlusIcon size={17} />}>
            إضافة كتاب
          </Tab>
        )}
      </nav>

      {/* أدوات صاحب المكتبة ليست ههنا: موضعُها `OwnerTools` — عمودٌ في
          فراغ الهبوط، ولوحٌ مطويٌّ في زاوية سائر الصفحات. الترويسةُ طريقُ
          الزائر، ولا يُضيَّق على المكتبة كلِّها من أجل ثلاثة أزرارٍ لا
          يراها إلا واحد. */}
      <div className="head-tools">
        <button
          type="button"
          onClick={cycleTheme}
          title={`تبديل المظهر (${THEME_LABELS[settings.theme]})`}
          aria-label="تبديل المظهر"
          className="icon-btn theme-btn"
        >
          {settings.theme === 'dark' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        {/* الزائر يفتح إعدادات العرض لنفسه، وصاحب المكتبة يفتح إعدادات المكتبة */}
        <button
          type="button"
          onClick={onOpenSettings}
          title={isOwner ? 'إعدادات المكتبة' : 'إعدادات العرض'}
          aria-label={isOwner ? 'إعدادات المكتبة' : 'إعدادات العرض'}
          className="icon-btn gear-btn"
        >
          <GearIcon size={19} />
        </button>
      </div>
    </header>
  )
}

function Tab(
  { to, on, icon, children }: { to: Route; on: boolean; icon: ReactNode; children: ReactNode },
) {
  return (
    <a
      {...linkTo(to)}
      className={on ? 'head-tab head-tab-on' : 'head-tab'}
      aria-current={on ? 'page' : undefined}
    >
      {icon}
      {children}
    </a>
  )
}
