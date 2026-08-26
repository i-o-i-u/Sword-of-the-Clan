// الترويسة الملتصقة أعلى الصفحة: الشعار واسم المكتبة، ثم حقل البحث السريع،
// ثم تبويبات التنقّل بأيقوناتها، وفي الطرف الأيسر تبديل المظهر والإعدادات.
//
// لا زرَّ لدخول صاحب المكتبة هنا: مدخله مخفيٌّ في صورة صفحة الهبوط
// (ثلاث نقراتٍ عليها)، فلا يرى الزائر بابًا لا يخصّه.

import { useState, type FormEvent } from 'react'
import { useLibrary } from '../lib/library'
import { navigate, type Route } from '../lib/router'
import { THEME_LABELS } from '../lib/theme'
import { LIBRARY_NAME } from '../lib/types'
import {
  BookPlusIcon, BooksIcon, GearIcon, HomeIcon, LibraryIcon, MoonIcon, PressIcon,
  QuillIcon, SearchIcon, SunIcon, resolveAsset,
} from './ui'

interface Props {
  route: Route
  onOpenSearch: (query?: string) => void
  onOpenSettings: () => void
}

export default function Header({ route, onOpenSearch, onOpenSettings }: Props) {
  const {
    isOwner, canEdit, ownerName, browseOnly, toggleBrowseOnly, signOut, settings, cycleTheme,
  } = useLibrary()
  const [quick, setQuick] = useState('')

  const vis = settings.visibility
  const showAuthorsTab = isOwner || vis.authors

  const onBrowse = route.name === 'browse' || route.name === 'book'
  const onAuthors = route.name === 'authors' || route.name === 'author'

  // في صفحة الهبوط تنتقل أدوات صاحب المكتبة إلى الصفحة نفسها: «إضافة كتاب»
  // إلى أزرار الإطار، واسمُه وأدواتُه إلى الفراغ عن يمين الصورة. فلا تُعاد
  // هنا مرّتين.
  const onLanding = route.name === 'landing'

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
    <header className="app-header" data-owner={isOwner && !onLanding ? '' : undefined}>
      <div className="brand" onClick={() => navigate({ name: 'landing' })}>
        <span className="brand-badge">
          <img src={resolveAsset('assets/logo.svg') ?? ''} alt="شعار المكتبة" />
        </span>
        <span className="brand-name">{LIBRARY_NAME}</span>
      </div>

      <form className="quick-search" onSubmit={submitQuick} role="search">
        <SearchIcon size={15} />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="بحثٌ سريع…"
          aria-label="بحث سريع في المكتبة"
        />
      </form>

      <nav className="head-nav">
        <button
          type="button"
          onClick={() => navigate({ name: 'landing' })}
          className={navClass(route.name === 'landing')}
        >
          <HomeIcon size={17} />
          الصفحة الأولى
        </button>

        <button type="button" onClick={() => navigate({ name: 'browse' })} className={navClass(onBrowse)}>
          <BooksIcon size={17} />
          {/* اسمُه دعوةٌ ما دمتَ خارجها، فإذا صرتَ فيها صار وصفًا لما تفعل */}
          {onBrowse ? 'تصفُّح المكتبة' : 'الدخول إلى المكتبة'}
        </button>

        {showAuthorsTab && (
          <button type="button" onClick={() => navigate({ name: 'authors' })} className={navClass(onAuthors)}>
            <QuillIcon size={17} />
            المؤلِّفون
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate({ name: 'publishers' })}
          className={navClass(route.name === 'publishers' || route.name === 'publisher')}
        >
          <PressIcon size={17} />
          دُوْر النَّشْر
        </button>

        <button
          type="button"
          onClick={() => navigate({ name: 'about' })}
          className={navClass(route.name === 'about' || route.name === 'stats')}
        >
          <LibraryIcon size={17} />
          عن المكتبة
        </button>

        {/* الإحصائيات لم تعد في الرأس — مدخلها من داخل «عن المكتبة» */}
        {canEdit && !onLanding && (
          <button type="button" onClick={() => navigate({ name: 'add' })} className={navClass(route.name === 'add')}>
            <BookPlusIcon size={17} />
            إضافة كتاب
          </button>
        )}
      </nav>

      <div className="head-tools">
        {isOwner && !onLanding && (
          <>
            <span className="owner-pill">{ownerName}</span>
            <button
              type="button"
              onClick={() => {
                toggleBrowseOnly()
                if (!browseOnly && route.name === 'add') navigate({ name: 'browse' })
              }}
              className="owner-button"
              style={{
                borderColor: browseOnly ? 'var(--accent)' : 'var(--border)',
                background: browseOnly ? 'oklch(0.42 0.09 45 / 0.1)' : 'none',
              }}
            >
              {browseOnly ? 'إظهار أدوات التعديل' : 'وضع التصفُّح فقط'}
            </button>
            <button type="button" onClick={() => void signOut()} className="owner-button" title="خروج">
              خروج
            </button>
          </>
        )}

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

const navClass = (active: boolean) => (active ? 'head-tab head-tab-on' : 'head-tab')
