// صورةُ الفائدة: بطاقةٌ تُحفظ صورةً أو تُرسَل في محادثة، على طراز بطاقة الاقتباس
// في صفحة الهبوط — أرضُ المكتبة وخطُّها ولونُها، والنصُّ في وسطها، وعزوُه
// تحته، واسمُ المكتبة في ذيلها.
//
// وتُرسم في لوح رسمٍ (`canvas`) في المتصفّح نفسه، فلا يُرسل النصُّ إلى خادمٍ
// يصنع منه صورة. والعربيةُ تُشكَّل في لوح الرسم كما تُشكَّل في الصفحة، والخطُّ
// خطُّ المكتبة بعد أن يحلّ (`document.fonts.load`).
//
// والشعرُ يُرسم شعرًا: البيتُ صدرُه في اليمين وعَجُزُه في اليسار، والرجزُ
// شطرٌ في الوسط — كما يُصفّ في البطاقة.

import { LIBRARY_NAME } from './types'

const W = 1080
const H = 1350
const PAD = 96

/** ألوانُ المظهر القائم، تُقرأ من رموزه فتتبع المظاهرَ الثلاثة */
function palette() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--surface', '#fbf6ee'),
    ground: v('--bg', '#f4ece0'),
    text: v('--text', '#2b2620'),
    muted: v('--muted', '#6b655c'),
    accent: v('--accent', '#7a4b2e'),
    border: v('--border', '#d8ccbb'),
  }
}

/** خطُّ المكتبة كما هو في الصفحة: «Kitab», «Amiri»… */
function bodyFont(): string {
  const cs = getComputedStyle(document.documentElement)
  return cs.getPropertyValue('--body-font').trim() || "'Amiri', serif"
}

/** سطرٌ من النصّ كما يُرسم: نثرٌ، أو بيتٌ بشطريه، أو شطرُ رجز */
type Line =
  | { kind: 'prose'; text: string }
  | { kind: 'verse'; a: string; b: string }
  | { kind: 'rajaz'; text: string }

/** يقرأ النصَّ المجرَّد أسطرًا، والشعرُ فيه على علامته (`lib/poetry.ts`) */
function readLines(text: string): Line[] {
  return text.split('\n').map((raw): Line | null => {
    const t = raw.trim()
    if (!t) return null
    const rajaz = /^\*\s*([^*]+?)\s*\*?$/.exec(t)
    if (rajaz) return { kind: 'rajaz', text: rajaz[1] }
    const verse = /^(?!\s*\*)(.+?)\s\*\s(.+)$/.exec(t)
    if (verse) return { kind: 'verse', a: verse[1].trim(), b: verse[2].trim() }
    return { kind: 'prose', text: t }
  }).filter((l): l is Line => l !== null)
}

/** يقسم النثرَ أسطرًا على عرض البطاقة، كلمةً كلمة */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > width && line) {
      out.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) out.push(line)
  return out
}

interface Laid { draw: (y: number) => void; height: number }

/** يصفّ الأسطرَ بحجم خطٍّ معلوم، ويُخبر بارتفاعها كلّها */
function layout(
  ctx: CanvasRenderingContext2D, lines: Line[], size: number, family: string, color: string,
): Laid[] {
  const lh = size * 1.95
  const inner = W - PAD * 2
  ctx.font = `${size}px ${family}`
  const out: Laid[] = []
  for (const line of lines) {
    if (line.kind === 'prose') {
      for (const row of wrap(ctx, line.text, inner)) {
        out.push({
          height: lh,
          draw: (y) => {
            ctx.font = `${size}px ${family}`
            ctx.fillStyle = color
            ctx.textAlign = 'right'
            ctx.fillText(row, W - PAD, y)
          },
        })
      }
    } else if (line.kind === 'rajaz') {
      out.push({
        height: lh,
        draw: (y) => {
          ctx.font = `${size}px ${family}`
          ctx.fillStyle = color
          ctx.textAlign = 'center'
          ctx.fillText(line.text, W / 2, y)
        },
      })
    } else {
      // البيتُ: صدرُه إلى اليمين وعَجُزُه إلى اليسار، بينهما فُرجة
      out.push({
        height: lh,
        draw: (y) => {
          ctx.font = `${size}px ${family}`
          ctx.fillStyle = color
          ctx.textAlign = 'right'
          ctx.fillText(line.a, W - PAD, y, inner / 2 - 24)
          ctx.textAlign = 'left'
          ctx.fillText(line.b, PAD, y, inner / 2 - 24)
        },
      })
    }
  }
  return out
}

export interface PerkImageInput {
  title: string
  text: string
  /** عزوُها سطرًا واحدًا: المصدرُ ومؤلِّفُه وموضعُه */
  cite: string
}

/**
 * يرسم البطاقة ويُعيدها صورةَ PNG. **والنصُّ يُصغَّر خطُّه حتى يتّسع**، فإن
 * لم يتّسع بأصغر خطٍّ يُقرأ قُطع وأُعلم بالقطع — البطاقةُ للمشاركة لا للنقل،
 * والنصُّ التامّ في رابط الفائدة.
 */
export async function renderPerkImage(input: PerkImageInput): Promise<Blob> {
  const family = bodyFont()
  try { await document.fonts?.load(`40px ${family}`) } catch { /* يُرسم بما حضر */ }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('المتصفّح لا يرسم الصور.')
  ctx.direction = 'rtl'
  ctx.textBaseline = 'alphabetic'
  const c = palette()

  // الأرضُ واللوحُ عليها بحاشيةٍ وإطار
  ctx.fillStyle = c.ground
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = c.bg
  ctx.strokeStyle = c.border
  ctx.lineWidth = 3
  roundRect(ctx, 40, 40, W - 80, H - 80, 36)
  ctx.fill()
  ctx.stroke()
  // شريطُ لون المكتبة في الرأس
  ctx.fillStyle = c.accent
  roundRect(ctx, W / 2 - 60, 40, 120, 10, 5)
  ctx.fill()

  const top = 150
  const bottom = H - 300
  let y = top

  if (input.title.trim()) {
    ctx.font = `bold 46px ${family}`
    ctx.fillStyle = c.accent
    ctx.textAlign = 'right'
    for (const row of wrap(ctx, input.title.trim(), W - PAD * 2).slice(0, 2)) {
      ctx.fillText(row, W - PAD, y)
      y += 68
    }
    y += 18
  }

  // النصُّ: أكبرُ خطٍّ يتّسع له، من ٤٤ إلى ٢٦
  const lines = readLines(input.text)
  let size = 44
  let laid = layout(ctx, lines, size, family, c.text)
  const room = bottom - y
  while (size > 26 && laid.reduce((h, l) => h + l.height, 0) > room) {
    size -= 2
    laid = layout(ctx, lines, size, family, c.text)
  }
  let used = 0
  let cut = false
  const fit: Laid[] = []
  for (const l of laid) {
    if (used + l.height > room) { cut = true; break }
    fit.push(l)
    used += l.height
  }
  // والنصُّ القصير يُوسَّط في موضعه ولا يلتصق بأعلاه
  let ty = y + Math.max(0, (room - used) / 2) + size
  for (const l of fit) { l.draw(ty); ty += l.height }
  if (cut) {
    ctx.font = `${Math.round(size * 0.8)}px ${family}`
    ctx.fillStyle = c.muted
    ctx.textAlign = 'center'
    ctx.fillText('… (مقتطَف — والنصُّ تامًّا في المكتبة)', W / 2, ty)
  }

  // العزوُ تحت فاصلٍ قصير
  const footTop = H - 270
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(W / 2 - 70, footTop)
  ctx.lineTo(W / 2 + 70, footTop)
  ctx.stroke()

  ctx.font = `30px ${family}`
  ctx.fillStyle = c.muted
  ctx.textAlign = 'center'
  let cy = footTop + 62
  for (const row of wrap(ctx, input.cite, W - PAD * 2).slice(0, 2)) {
    ctx.fillText(row, W / 2, cy)
    cy += 48
  }

  ctx.font = `bold 32px ${family}`
  ctx.fillStyle = c.accent
  ctx.fillText(LIBRARY_NAME, W / 2, H - 92)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('تعذّر صنعُ الصورة.'))), 'image/png')
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * يُسلِّم الصورة: بالمشاركة إن كان الجهازُ يشارك الملفّات — وهو الجوّال غالبًا،
 * وإليه تُرسل الفائدةُ في محادثة — وإلّا فبالتنزيل.
 */
export async function shareOrDownload(blob: Blob, name: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], name, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] })
      return 'shared'
    } catch (e) {
      // ومن أغلق لوحةَ المشاركة لم يُرد التنزيل
      if ((e as DOMException)?.name === 'AbortError') return 'shared'
    }
  }
  downloadBlob(blob, name)
  return 'saved'
}

/** يُنزِّل ملفًّا صُنع في المتصفّح */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
