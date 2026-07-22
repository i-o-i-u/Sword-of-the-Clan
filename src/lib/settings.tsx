import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type FontChoice = 'tajawal' | 'cairo' | 'amiri' | 'almarai'
export type FontSize = 'sm' | 'md' | 'lg'

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'فاتح',
  dark: 'داكن',
  auto: 'تلقائي (حسب الجهاز)',
}

export const FONT_LABELS: Record<FontChoice, string> = {
  tajawal: 'Tajawal — تجوال',
  cairo: 'Cairo — القاهرة',
  amiri: 'Amiri — أميري (نسخي)',
  almarai: 'Almarai — المرعي',
}

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'صغير',
  md: 'متوسط',
  lg: 'كبير',
}

interface SettingsState {
  theme: ThemeMode
  font: FontChoice
  fontSize: FontSize
  setTheme: (t: ThemeMode) => void
  setFont: (f: FontChoice) => void
  setFontSize: (s: FontSize) => void
}

const STORAGE_KEY = 'sotc-settings'

function loadInitial(): { theme: ThemeMode; font: FontChoice; fontSize: FontSize } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        theme: parsed.theme ?? 'auto',
        font: parsed.font ?? 'tajawal',
        fontSize: parsed.fontSize ?? 'md',
      }
    }
  } catch {
    // تجاهل أي تلف في البيانات المخزّنة محليًا والعودة للقيم الافتراضية
  }
  return { theme: 'auto', font: 'tajawal', fontSize: 'md' }
}

const SettingsContext = createContext<SettingsState | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(loadInitial, [])
  const [theme, setTheme] = useState<ThemeMode>(initial.theme)
  const [font, setFont] = useState<FontChoice>(initial.font)
  const [fontSize, setFontSize] = useState<FontSize>(initial.fontSize)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, font, fontSize }))
  }, [theme, font, fontSize])

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      const resolved = theme === 'auto' ? (media.matches ? 'dark' : 'light') : theme
      root.setAttribute('data-theme', resolved)
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-font', font)
  }, [font])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  const value: SettingsState = { theme, font, fontSize, setTheme, setFont, setFontSize }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
