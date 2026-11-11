// عارض الصورة مكبَّرةً: يُفتح بالنقر على غلاف الكتاب، وفيه تكبيرٌ وتصغيرٌ
// وتنزيلٌ وإغلاق.
//
// والتنزيل يجري على نسخةٍ في الذاكرة (blob) لا على الرابط مباشرةً: صور
// المكتبة على مضيفٍ آخر، و`download` في الوصلة لا يعمل على أصلٍ مختلف —
// فينفتح الملفّ في لسانٍ جديد بدل أن يُحفظ. فإن تعذّر الجلب فُتح في لسانٍ
// جديد صراحةً، وهو أهونُ من زرٍّ لا يفعل شيئًا.

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScrollLock } from '../lib/useScrollLock'
import { DownloadIcon, ZoomIcon, resolveAsset } from './ui'


const MIN_ZOOM = 1
const MAX_ZOOM = 5
const STEP = 0.5

interface Props {
  url: string | null | undefined
  /** ما يُسمَّى به الملفّ عند تنزيله، وما يُقرأ بديلًا عن الصورة */
  name: string
  onClose: () => void
}

/** امتدادُ الملفّ من نوعه */
function extOf(type: string): string {
  const map: Record<string, string> = {
    'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png',
    'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  }
  return map[type] ?? 'jpg'
}

/** أعلى الجهازِ لمسٌ لا فأرة؟ فلا يُقال له «دوِّر العجلة» */
const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export default function ImageViewer({ url, name, onClose }: Props) {
  const resolved = resolveAsset(url)
  const [zoom, setZoom] = useState(1)
  // الإزاحة: بها يُجَرّ ما خرج عن الشاشة بعد التكبير
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  // الأصابعُ على الشاشة: بإصبعين تُكبَّر الصورةُ وتُصغَّر، كما في كلّ عارض صور
  const fingers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const spread = () => {
    const [a, b] = [...fingers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  useScrollLock()

  const zoomTo = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))))
    setZoom(clamped)
    // العودة إلى الحجم الأصل تُعيد الصورة إلى مركزها، فلا تبقى مزاحةً
    if (clamped === MIN_ZOOM) setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoomTo(zoom + STEP)
      if (e.key === '-') zoomTo(zoom - STEP)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, zoom, zoomTo])

  async function download() {
    if (!resolved || busy) return
    setBusy(true)
    try {
      const res = await fetch(resolved)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      // الامتدادُ من نوع الملفّ نفسِه: الصورُ تُصغَّر WebP قبل رفعها، وكانت
      // تُنزَّل باسمٍ ينتهي بـ.jpg فلا يفتحها بعضُ البرامج
      a.download = `${name.replace(/[\\/:*?"<>|]/g, '') || 'صورة'}.${extOf(blob.type)}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch {
      window.open(resolved, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  if (!resolved) return null

  // موضعُها من `body` كسائر الطبقات: `#root` مكبَّرٌ بـ`zoom` وهو سياقٌ
  // يتعلّق به الثابتُ، فلا تبلغ الطبقةُ أطرافَ الشاشة في بعض المتصفّحات
  return createPortal(
    <div className="viewer" onClick={onClose} role="dialog" aria-label={`عرض صورة ${name}`}>
      <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
        <span className="viewer-name">{name}</span>

        <span className="viewer-tools">
          <button
            type="button"
            onClick={() => zoomTo(zoom - STEP)}
            disabled={zoom <= MIN_ZOOM}
            title="تصغير"
            aria-label="تصغير"
          >
            <ZoomIcon size={17} out />
          </button>
          <span className="viewer-zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => zoomTo(zoom + STEP)}
            disabled={zoom >= MAX_ZOOM}
            title="تكبير"
            aria-label="تكبير"
          >
            <ZoomIcon size={17} />
          </button>

          <button
            type="button"
            onClick={() => void download()}
            title="تنزيل الصورة"
            aria-label="تنزيل الصورة"
          >
            <DownloadIcon size={17} />
          </button>

          <button type="button" onClick={onClose} title="إغلاق" aria-label="إغلاق" className="viewer-close">
            ×
          </button>
        </span>
      </div>

      <div
        className="viewer-stage"
        onClick={(e) => e.stopPropagation()}
        // عجلةُ الفأرة تكبّر وتصغّر، وهو ما يتوقّعه من نظر في صورة
        onWheel={(e) => zoomTo(zoom + (e.deltaY < 0 ? STEP / 2 : -STEP / 2))}
        onPointerDown={(e) => {
          fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          e.currentTarget.setPointerCapture(e.pointerId)
          if (fingers.current.size === 2) {
            drag.current = null
            pinch.current = { dist: spread(), zoom }
            return
          }
          if (zoom <= MIN_ZOOM) return
          drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
        }}
        onPointerMove={(e) => {
          if (fingers.current.has(e.pointerId)) {
            fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          }
          const p = pinch.current
          if (p && fingers.current.size === 2) {
            zoomTo(p.zoom * (spread() / Math.max(1, p.dist)))
            return
          }
          const d = drag.current
          if (!d) return
          setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
        }}
        onPointerUp={(e) => {
          fingers.current.delete(e.pointerId)
          if (fingers.current.size < 2) pinch.current = null
          drag.current = null
        }}
        onPointerCancel={(e) => {
          fingers.current.delete(e.pointerId)
          pinch.current = null
          drag.current = null
        }}
        style={{ cursor: zoom > MIN_ZOOM ? 'grab' : 'default', touchAction: 'none' }}
      >
        <img
          src={resolved}
          alt={name}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
      </div>

      <div className="viewer-hint" onClick={(e) => e.stopPropagation()}>
        {zoom > MIN_ZOOM
          ? 'اسحب الصورة لتُحرِّكها'
          : (TOUCH ? 'باعِد بين إصبعين للتكبير' : 'دَوِّر عجلة الفأرة للتكبير')}
      </div>
    </div>,
    document.body,
  )
}
