// إعدادات الزائر لنفسه: المظهر والخطّ وحجم الواجهة، لا غير.
//
// ما يختاره هنا يُحفظ في متصفّحه فورًا ولا يمسّ إعدادات المكتبة — فليس
// للزائر أن يغيّر ما يراه غيره. ولذلك لا زرَّ حفظٍ فيها: الأثر فوريّ.

import { useLibrary } from '../lib/library'
import { FONTS, FONT_LABELS, FONT_ORDER, THEMES, THEME_LABELS, THEME_ORDER } from '../lib/theme'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import type { FontName, ThemeName } from '../lib/types'
import { CloseButton, Overlay, cardStyle } from './ui'

export default function ViewerSettingsOverlay({ onClose }: { onClose: () => void }) {
  const { settings, setViewerPref } = useLibrary()
  useScrollLock()
  useEscapeKey(onClose)

  const optionCard = (active: boolean) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '14px 8px',
    borderRadius: 10,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'oklch(0.42 0.09 45 / 0.08)' : 'transparent',
    color: 'var(--text)',
  })

  return (
    <Overlay onClose={onClose} zIndex={90}>
      <div style={{
        ...cardStyle, width: 440, maxWidth: '94vw', borderRadius: 18,
        boxShadow: '0 30px 70px oklch(0.1 0.01 50 / 0.42)', padding: 24,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, marginBottom: 18,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 19, fontWeight: 700 }}>
              إعدادات العرض
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.7 }}>
              اختيارك يبقى في متصفّحك وحده، ولا يُغيِّر ما يراه غيرك.
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>
          الخطّ
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {FONT_ORDER.map((key: FontName) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewerPref({ font: key })}
              style={optionCard(settings.font === key)}
            >
              <span style={{ fontFamily: FONTS[key].heading, fontSize: 20, fontWeight: 700 }}>
                Aa أب
              </span>
              <span style={{ fontSize: 12 }}>{FONT_LABELS[key]}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>
          المظهر
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {THEME_ORDER.map((key: ThemeName) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewerPref({ theme: key })}
              style={optionCard(settings.theme === key)}
            >
              <span style={{
                width: 36, height: 24, borderRadius: 5,
                background: THEMES[key].bg, border: `1px solid ${THEMES[key].border}`,
              }} />
              <span style={{ fontSize: 12 }}>{THEME_LABELS[key]}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12.5, color: 'var(--muted)', marginBottom: 8,
          }}>
            <span style={{ fontWeight: 600 }}>حجم الخطّ</span>
            <span>{settings.ui_scale}%</span>
          </div>
          <input
            type="range" min={85} max={125} step={5}
            value={settings.ui_scale}
            onChange={(e) => setViewerPref({ ui_scale: Number(e.target.value) })}
            aria-label="حجم الخطّ"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Overlay>
  )
}
