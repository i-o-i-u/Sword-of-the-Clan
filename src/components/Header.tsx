// الترويسة الملتصقة أعلى الصفحة (§٤): الشعار، وتبويبات التنقّل، وأزرار
// البحث والمظهر والإعدادات، ثم أدوات الحساب.

import { useLibrary } from '../lib/library'
import { navigate, type Route } from '../lib/router'
import { THEME_LABELS } from '../lib/theme'
import {
  GearIcon, SearchIcon, SunIcon, iconButtonStyle, resolveAsset, tabStyle,
} from './ui'

interface Props {
  route: Route
  onOpenSearch: () => void
  onOpenSettings: () => void
  onOpenLogin: () => void
}

export default function Header({ route, onOpenSearch, onOpenSettings, onOpenLogin }: Props) {
  const {
    isOwner, canEdit, ownerName, browseOnly, toggleBrowseOnly, signOut, settings, cycleTheme,
  } = useLibrary()

  const vis = settings.visibility
  const showAuthorsTab = isOwner || vis.authors
  const showStatsTab = isOwner || vis.stats

  const onBrowse = route.name === 'browse' || route.name === 'book'
  const onAuthors = route.name === 'authors' || route.name === 'author'

  return (
    <header
      className="app-header"
      style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--header)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 22, padding: '12px 32px',
        flexWrap: 'wrap',
      }}
    >
      <div
        onClick={() => navigate({ name: 'landing' })}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'oklch(0.98 0.01 75)',
          border: '1.5px solid oklch(0.32 0.08 40)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden', flex: 'none',
        }}>
          <img
            src={resolveAsset('assets/logo.svg') ?? ''}
            alt="شعار المكتبة"
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 20, lineHeight: 1.1 }}>
            مكتبة سيف العشيرة
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.5px' }}>
            فهرس المكتبة المنزلية
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => navigate({ name: 'browse' })} style={tabStyle(onBrowse)}>
          تصفّح المكتبة
        </button>
        {showAuthorsTab && (
          <button type="button" onClick={() => navigate({ name: 'authors' })} style={tabStyle(onAuthors)}>
            المؤلِّفون
          </button>
        )}
        {showStatsTab && (
          <button type="button" onClick={() => navigate({ name: 'stats' })} style={tabStyle(route.name === 'stats')}>
            الإحصائيات
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={() => navigate({ name: 'add' })} style={tabStyle(route.name === 'add')}>
            إضافة كتاب
          </button>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onOpenSearch} title="بحث" aria-label="بحث" style={iconButtonStyle}>
          <SearchIcon size={18} />
        </button>
        <button
          type="button"
          onClick={cycleTheme}
          title={`تبديل المظهر (${THEME_LABELS[settings.theme]})`}
          aria-label="تبديل المظهر"
          style={iconButtonStyle}
        >
          <SunIcon />
        </button>

        {!isOwner && (
          <button
            type="button"
            onClick={onOpenLogin}
            style={{
              border: '1.5px solid var(--accent)', background: 'none', color: 'var(--accent)',
              borderRadius: 9, padding: '7px 15px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
            }}
          >
            دخول صاحب المكتبة
          </button>
        )}

        {isOwner && (
          <>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)',
              background: 'var(--bg)', borderRadius: 999, padding: '5px 12px',
              fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap',
            }}>
              {ownerName}
            </span>
            <button
              type="button"
              onClick={() => {
                toggleBrowseOnly()
                if (!browseOnly && route.name === 'add') navigate({ name: 'browse' })
              }}
              style={{
                border: `1.5px solid ${browseOnly ? 'var(--accent)' : 'var(--border)'}`,
                background: browseOnly ? 'oklch(0.42 0.09 45 / 0.1)' : 'none',
                color: 'var(--text)', borderRadius: 9, padding: '7px 13px',
                fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >
              {browseOnly ? 'إظهار أدوات التعديل' : 'وضع التصفُّح فقط'}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              title="خروج"
              style={{
                border: '1px solid var(--border)', background: 'none', color: 'var(--muted)',
                borderRadius: 9, padding: '7px 11px', fontSize: 12.5,
              }}
            >
              خروج
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              title="الإعدادات"
              aria-label="الإعدادات"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', borderRadius: 9, padding: 8,
              }}
            >
              <GearIcon />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
