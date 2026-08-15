// عارض الصورة مكبَّرةً: يُفتح بالنقر على غلاف الكتاب، وفيه تكبيرٌ وتصغيرٌ
// وتنزيلٌ وإغلاق.
//
// والتنزيل يجري على نسخةٍ في الذاكرة (blob) لا على الرابط مباشرةً: صور
// المكتبة على مضيفٍ آخر، و`download` في الوصلة لا يعمل على أصلٍ مختلف —
// فينفتح الملفّ في لسانٍ جديد بدل أن يُحفظ. فإن تعذّر الجلب فُتح في لسانٍ
// جديد صراحةً، وهو أهونُ من زرٍّ لا يفعل شيئًا.

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

export default function ImageViewer({ url, name, onClose }: Props) {
  const resolved = resolveAsset(url)
  const [zoom, setZoom] = useState(1)
  // الإزاحة: بها يُجَرّ ما خرج عن الشاشة بعد التكبير
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

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
      a.download = `${name.replace(/[\\/:*?"<>|]/g, '') || 'صورة'}.jpg`
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

  return (
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
          if (zoom <= MIN_ZOOM) return
          drag.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        style={{ cursor: zoom > MIN_ZOOM ? 'grab' : 'default' }}
      >
        <img
          src={resolved}
          alt={name}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
      </div>

      <div className="viewer-hint" onClick={(e) => e.stopPropagation()}>
        {zoom > MIN_ZOOM ? 'اسحب الصورة لتُحرِّكها' : 'دَوِّر عجلة الفأرة للتكبير'}
      </div>
    </div>
  )
}
