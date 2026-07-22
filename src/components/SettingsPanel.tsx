import {
  FONT_LABELS,
  FONT_SIZE_LABELS,
  FontChoice,
  FontSize,
  THEME_LABELS,
  ThemeMode,
  useSettings,
} from '../lib/settings'

interface Props {
  open: boolean
  onClose: () => void
}

const THEME_OPTIONS: ThemeMode[] = ['light', 'dark', 'auto']
const FONT_OPTIONS: FontChoice[] = ['tajawal', 'cairo', 'amiri', 'almarai']
const FONT_SIZE_OPTIONS: FontSize[] = ['sm', 'md', 'lg']

export default function SettingsPanel({ open, onClose }: Props) {
  const { theme, font, fontSize, setTheme, setFont, setFontSize } = useSettings()

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`settings-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="settings-drawer-header">
          <h2>⚙️ الإعدادات</h2>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق الإعدادات">
            ✕
          </button>
        </div>

        <section className="settings-section">
          <h3>المظهر</h3>
          <div className="option-grid">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t}
                className={`option-chip ${theme === t ? 'is-active' : ''}`}
                onClick={() => setTheme(t)}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>نوع الخط</h3>
          <div className="option-grid option-grid-font">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f}
                className={`option-chip font-preview font-${f} ${font === f ? 'is-active' : ''}`}
                onClick={() => setFont(f)}
              >
                {FONT_LABELS[f]}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>حجم الخط</h3>
          <div className="option-grid">
            {FONT_SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                className={`option-chip ${fontSize === s ? 'is-active' : ''}`}
                onClick={() => setFontSize(s)}
              >
                {FONT_SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        <p className="settings-note">تُحفظ هذه التفضيلات في متصفحك فقط، ولا تحتاج إلى حساب.</p>
      </aside>
    </>
  )
}
