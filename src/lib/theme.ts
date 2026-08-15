// رموز التصميم (§٩). القيم نهائية، وتُطبَّق كمتغيرات CSS على جذر الصفحة
// حتى ينتقل المظهر كله بتبديل واحد.

import type { FontName, ThemeName } from './types'

export interface ThemeTokens {
  bg: string
  surface: string
  header: string
  border: string
  text: string
  muted: string
  accentSoft: string
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  warm: {
    bg: 'oklch(0.96 0.02 75)',
    surface: 'oklch(0.98 0.012 78)',
    header: 'oklch(0.93 0.025 68)',
    border: 'oklch(0.85 0.02 65)',
    text: 'oklch(0.24 0.02 50)',
    muted: 'oklch(0.48 0.02 50)',
    accentSoft: 'oklch(0.42 0.09 45)',
  },
  sepia: {
    bg: 'oklch(0.93 0.035 80)',
    surface: 'oklch(0.96 0.03 80)',
    header: 'oklch(0.88 0.04 78)',
    border: 'oklch(0.78 0.04 75)',
    text: 'oklch(0.28 0.03 55)',
    muted: 'oklch(0.5 0.03 55)',
    accentSoft: 'oklch(0.42 0.09 45)',
  },
  dark: {
    bg: 'oklch(0.22 0.015 50)',
    surface: 'oklch(0.275 0.015 50)',
    header: 'oklch(0.19 0.015 45)',
    border: 'oklch(0.37 0.02 50)',
    text: 'oklch(0.93 0.01 75)',
    muted: 'oklch(0.68 0.015 60)',
    accentSoft: 'oklch(0.62 0.1 55)',
  },
}

export const THEME_LABELS: Record<ThemeName, string> = {
  warm: 'دافئ فاتح',
  sepia: 'ورقي',
  dark: 'جلدي داكن',
}

export const THEME_ORDER: ThemeName[] = ['warm', 'sepia', 'dark']

// خط «كتاب» ملفٌّ محلّي مرخَّص لصاحب المكتبة؛ إن لم يُرفَع يتراجع تلقائيًا إلى أميري.
export const FONTS: Record<FontName, { heading: string; body: string }> = {
  kitab:   { heading: "'Kitab','Amiri',serif",  body: "'Kitab','Amiri',serif" },
  classic: { heading: "'Amiri',serif",          body: "'Cairo',sans-serif" },
  modern:  { heading: "'Markazi Text',serif",   body: "'Tajawal',sans-serif" },
}

export const FONT_LABELS: Record<FontName, string> = {
  kitab: 'كتاب (تلقائي)',
  classic: 'كلاسيكي (أميري)',
  modern: 'حديث (مرزي)',
}

export const FONT_ORDER: FontName[] = ['kitab', 'classic', 'modern']

/** ألوان ثابتة لا تتبدّل مع المظهر */
export const ACCENT = 'oklch(0.42 0.09 45)'
export const ACCENT_DARK = 'oklch(0.32 0.08 40)'
export const ON_ACCENT = 'oklch(0.98 0.01 75)'
export const FACET_ACTIVE_BG = 'oklch(0.93 0.03 45)'
export const STAR = 'oklch(0.55 0.13 70)'
export const READ_GREEN = 'oklch(0.5 0.1 150)'
export const UNREAD_GREY = 'oklch(0.65 0.01 60)'
export const DANGER = 'oklch(0.5 0.15 28)'
export const COVER_BG = 'oklch(0.9 0.02 65)'

/** الظلال المعتمدة */
export const SHADOW = {
  activeChip: '0 1px 3px oklch(0.24 0.02 50 / 0.15)',
  spineHover: '0 8px 16px oklch(0.2 0.02 50 / 0.3)',
  primaryBtn: '0 8px 20px oklch(0.24 0.02 50 / 0.18)',
  cardHover: '0 10px 24px oklch(0.24 0.02 50 / 0.12)',
  cover: '0 12px 30px oklch(0.24 0.02 50 / 0.15)',
  datePopover: '0 18px 40px oklch(0.2 0.02 50 / 0.25)',
  landingImage: '0 24px 60px oklch(0.24 0.02 50 / 0.28)',
  overlay: '0 30px 70px oklch(0.1 0.01 50 / 0.4)',
  settings: '0 34px 80px oklch(0.1 0.01 50 / 0.45)',
}

/**
 * يسجّل خط «كتاب» المحلّي إن رُفع إلى public/fonts. مساره يتبع مسار النشر،
 * ولذلك يُكتب هنا لا في ملف الأنماط. غيابه غير ضارّ: يتراجع الخط إلى أميري.
 */
let fontRegistered = false
function registerLocalFont() {
  if (fontRegistered) return
  fontRegistered = true
  const style = document.createElement('style')
  style.textContent = `@font-face {
    font-family: 'Kitab';
    src: url('${import.meta.env.BASE_URL}fonts/Kitab-Regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }`
  document.head.appendChild(style)
}

/**
 * العائلات التي تُجلب من جوجل عند اختيار خطّها لا مع كل تحميل. أميري خارجَها
 * لأنه بديل «كتاب» في كل الأحوال، فورقتُه في index.html غيرَ حاجبةٍ للرسم.
 */
const WEB_FONTS: Partial<Record<FontName, string>> = {
  classic: 'family=Cairo:wght@400;500;600;700',
  modern: 'family=Markazi+Text:wght@500;700&family=Tajawal:wght@400;500;700',
}

const loadedWebFonts = new Set<FontName>()
function ensureWebFont(font: FontName) {
  const query = WEB_FONTS[font]
  if (!query || loadedWebFonts.has(font)) return
  loadedWebFonts.add(font)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  // media=print يمنع الورقةَ من حجب الرسم ريثما تصل، ثم تُعمَّم عند وصولها
  link.media = 'print'
  link.onload = () => { link.media = 'all' }
  link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`
  document.head.appendChild(link)
}

/** يكتب رموز المظهر والخط على جذر الصفحة */
export function applyTheme(theme: ThemeName, font: FontName, uiScale: number) {
  registerLocalFont()
  ensureWebFont(font)
  const t = THEMES[theme] ?? THEMES.warm
  const f = FONTS[font] ?? FONTS.kitab
  const root = document.documentElement.style
  root.setProperty('--bg', t.bg)
  root.setProperty('--surface', t.surface)
  root.setProperty('--header', t.header)
  root.setProperty('--border', t.border)
  root.setProperty('--text', t.text)
  root.setProperty('--muted', t.muted)
  root.setProperty('--accent-soft', t.accentSoft)
  root.setProperty('--heading-font', f.heading)
  root.setProperty('--body-font', f.body)
  root.setProperty('--ui-scale', String(uiScale / 100))
  document.documentElement.dataset.theme = theme
}
