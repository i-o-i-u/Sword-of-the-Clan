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
  BooksIcon, GearIcon, LibraryIcon, MoonIcon, QuillIcon, SearchIcon, SunIcon,
  iconButtonStyle, resolveAsset,
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

  /** حقل البحث يسلّم ما كُتب فيه إلى لوحة البحث ثم يفرغ */
  function submitQuick(e: FormEvent) {
    e.preventDefault()
    onOpenSearch(quick.trim() || undefined)
    setQuick('')
  }

  return (
    <header className="app-header">
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
        <button type="button" onClick={() => navigate({ name: 'browse' })} className={navClass(onBrowse)}>
          <BooksIcon size={17} />
          الدخول إلى المكتبة
        </button>

        {showAuthorsTab && (
          <button type="button" onClick={() => navigate({ name: 'authors' })} className={navClass(onAuthors)}>
            <QuillIcon size={17} />
            المؤلِّفون
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate({ name: 'about' })}
          className={navClass(route.name === 'about' || route.name === 'stats')}
        >
          <LibraryIcon size={17} />
          عن المكتبة
        </button>

        {/* الإحصائيات لم تعد في الرأس — مدخلها من داخل «عن المكتبة» */}
        {canEdit && (
          <button type="button" onClick={() => navigate({ name: 'add' })} className={navClass(route.name === 'add')}>
            إضافة كتاب
          </button>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="head-tools">
        {isOwner && (
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
          style={iconButtonStyle}
        >
          {settings.theme === 'dark' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        {/* الزائر يفتح إعدادات العرض لنفسه، وصاحب المكتبة يفتح إعدادات المكتبة */}
        <button
          type="button"
          onClick={onOpenSettings}
          title={isOwner ? 'إعدادات المكتبة' : 'إعدادات العرض'}
          aria-label={isOwner ? 'إعدادات المكتبة' : 'إعدادات العرض'}
          style={iconButtonStyle}
        >
          <GearIcon size={19} />
        </button>
      </div>
    </header>
  )
}

const navClass = (active: boolean) => (active ? 'head-tab head-tab-on' : 'head-tab')
