// موضع صورة: يعرضها إن وُجدت، ويستقبل رفعها لصاحب المكتبة نقرًا أو إفلاتًا.
// هذا بديل image-slot.js الذي كان في النموذج الأوّلي؛ هنا يُرفَع الملف فعلًا
// إلى مخزن Convex ويُحفَظ رابطه في قاعدة البيانات.

import { useRef, useState, type CSSProperties } from 'react'
import { uploadImage } from '../lib/api'
import { resolveAsset } from './ui'

interface Props {
  url: string | null | undefined
  /** مجلد الرفع داخل المخزن: covers أو spines أو landing */
  folder: string
  /** يُستدعى بعد نجاح الرفع؛ لا يلزم في العرض المجرّد */
  onUploaded?: (url: string) => void | Promise<void>
  canEdit: boolean
  placeholder?: string
  radius?: number
  style?: CSSProperties
}

export default function ImageSlot(
  { url, folder, onUploaded, canEdit, placeholder = 'صورة', radius = 0, style }: Props,
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const resolved = resolveAsset(url)

  async function handleFile(file: File | undefined | null) {
    if (!file || !canEdit) return
    if (!file.type.startsWith('image/')) {
      setFailed('الملف ليس صورة')
      return
    }
    setBusy(true)
    setFailed(null)
    try {
      const uploaded = await uploadImage(folder, file)
      await onUploaded?.(uploaded)
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'تعذّر الرفع')
    } finally {
      setBusy(false)
    }
  }

  const interactive = canEdit && !busy

  return (
    <div
      onClick={() => interactive && inputRef.current?.click()}
      onDragOver={(e) => { if (interactive) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!interactive) return
        e.preventDefault()
        setDragging(false)
        void handleFile(e.dataTransfer.files?.[0])
      }}
      title={canEdit ? 'اضغط أو أفلِت صورةً هنا' : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--cover-bg)',
        borderRadius: radius,
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: dragging ? '2px dashed var(--accent)' : 'none',
        outlineOffset: -3,
        ...style,
      }}
    >
      {resolved ? (
        <img
          src={resolved}
          alt={placeholder}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          fontSize: 11, color: 'oklch(0.45 0.02 60)', textAlign: 'center',
          padding: 8, lineHeight: 1.6,
        }}>
          {busy ? '…جارٍ الرفع' : placeholder}
        </span>
      )}

      {resolved && busy && (
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'oklch(0.15 0.01 50 / 0.45)',
          color: 'oklch(0.98 0.01 75)', fontSize: 11,
        }}>
          …جارٍ الرفع
        </span>
      )}

      {failed && (
        <span style={{
          position: 'absolute', insetInline: 0, bottom: 0, padding: '3px 6px',
          background: 'oklch(0.5 0.15 28)', color: 'oklch(0.98 0.01 75)',
          fontSize: 10, textAlign: 'center',
        }}>
          {failed}
        </span>
      )}

      {canEdit && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      )}
    </div>
  )
}
