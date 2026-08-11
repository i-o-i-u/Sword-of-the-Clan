// صفحة الهبوط (§٥-١): الشريحة الحالية بصورتها واقتباسها، مع تبديلٍ تلقائي
// اختياري ونقاطٍ للتنقّل بينها.

import { useEffect, useMemo, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import ImageSlot from '../components/ImageSlot'
import { SearchIcon, SunIcon } from '../components/ui'

interface Props {
  onOpenSearch: () => void
  onOpenSettings: () => void
}

export default function Landing({ onOpenSearch, onOpenSettings }: Props) {
  const { settings, slides, books, isOwner, cycleTheme } = useLibrary()
  const [index, setIndex] = useState(0)

  // التبديل التلقائي بين الشرائح، ويتوقّف حين تكون شريحةً واحدة
  useEffect(() => {
    if (!settings.auto_rotate || slides.length <= 1) return
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      settings.rotate_seconds * 1000,
    )
    return () => clearInterval(timer)
  }, [settings.auto_rotate, settings.rotate_seconds, slides.length])

  useEffect(() => { if (index >= slides.length) setIndex(0) }, [slides.length, index])

  const slide = slides[Math.min(index, Math.max(0, slides.length - 1))]

  const stats = useMemo(() => {
    const authorNames = new Set(books.map((b) => b.author_name).filter(Boolean))
    const categoryNames = new Set(books.map((b) => b.category).filter(Boolean))
    return { books: books.length, authors: authorNames.size, categories: categoryNames.size }
  }, [books])

  const ghostButton = {
    background: 'none', color: 'var(--text)', border: '1.5px solid var(--border)',
    borderRadius: 10, padding: '14px 26px', fontSize: 15, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
  } as const

  return (
    <main className="landing-main" style={{ maxWidth: 1220, margin: '0 auto', padding: '64px 32px 40px' }}>
      <div
        className="landing-grid"
        style={{
          display: 'grid', gridTemplateColumns: '1.05fr 0.75fr', gap: 64,
          alignItems: 'center', marginBottom: 56,
        }}
      >
        <div>
          <div style={{
            fontSize: 13, letterSpacing: '2px', color: 'var(--accent-soft)',
            fontWeight: 700, marginBottom: 14,
          }}>
            {settings.landing_tagline}
          </div>
          <h1 className="landing-title" style={{
            fontFamily: 'var(--heading-font)', fontSize: 52, lineHeight: 1.18,
            fontWeight: 700, margin: '0 0 20px',
          }}>
            {settings.landing_title}
          </h1>
          <p style={{
            fontSize: 16.5, lineHeight: 1.9, color: 'var(--muted)',
            maxWidth: 520, margin: '0 0 30px',
          }}>
            {settings.landing_intro}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 38 }}>
            <button
              type="button"
              onClick={() => navigate({ name: 'browse' })}
              style={{
                background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
                borderRadius: 10, padding: '14px 26px', fontSize: 15, fontWeight: 700,
                boxShadow: '0 8px 20px oklch(0.24 0.02 50 / 0.18)',
              }}
            >
              تصفّح المكتبة
            </button>
            <button type="button" onClick={onOpenSearch} style={ghostButton}>
              <SearchIcon />
              ابحث عن كتاب
            </button>
            {/* صاحب المكتبة يفتح الإعدادات، والزائر يبدّل المظهر لنفسه */}
            <button type="button" onClick={isOwner ? onOpenSettings : cycleTheme} style={ghostButton}>
              <SunIcon size={16} />
              مظهر الواجهة
            </button>
          </div>

          {settings.show_landing_stats && (
            <div style={{ display: 'flex', gap: 28, paddingTop: 26, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {([[stats.books, 'كتاب مفهرس'], [stats.authors, 'مؤلِّفًا'], [stats.categories, 'تصنيفات']] as const).map(
                ([value, label]) => (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--heading-font)', fontSize: 26, fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -18, border: '1px solid var(--border)', borderRadius: 20 }} />
          <div style={{
            width: '100%', aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 24px 60px oklch(0.24 0.02 50 / 0.28)', position: 'relative',
            background: 'var(--cover-bg)',
          }}>
            <ImageSlot
              url={slide?.image_url}
              folder="landing"
              canEdit={false}
              placeholder="صورة غلاف المكتبة"
            />
          </div>
        </div>
      </div>

      {settings.show_landing_quote && slide && (slide.quote || slide.author) && (
        <div className="quote-card" style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '34px 44px', textAlign: 'center', position: 'relative',
        }}>
          <div style={{
            fontFamily: 'var(--heading-font)', fontSize: 44, lineHeight: 0,
            color: 'var(--accent-soft)', opacity: 0.5, position: 'absolute', top: 24, right: 36,
          }}>
            ”
          </div>
          <p style={{
            fontFamily: 'var(--heading-font)', fontSize: 19.5, lineHeight: 2.1, maxWidth: 820,
            margin: '0 auto 14px', color: 'var(--text)', textAlign: 'justify',
            textWrap: 'pretty', whiteSpace: 'pre-line',
          }}>
            {slide.quote}
          </p>
          {slide.author && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>— {slide.author}</div>
          )}

          {slides.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 14 }}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`الشريحة ${i + 1}`}
                  onClick={() => setIndex(i)}
                  style={{
                    width: 7, height: 7, borderRadius: '50%', border: 'none', padding: 0,
                    background: i === index ? 'var(--accent-soft)' : 'var(--border)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
