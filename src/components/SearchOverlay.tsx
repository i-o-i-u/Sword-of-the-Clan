// لوحة البحث السريع (§٥-٨): تفتح فوق الصفحة، وتبحث في الحقول كلها،
// وتعرض عشرين نتيجة على الأكثر.

import { useMemo, useRef, useEffect, useState } from 'react'
import { useLibrary } from '../lib/library'
import { navigate } from '../lib/router'
import { QUICK_OPTS, ALL_SEARCH_KEYS, matchBook } from '../lib/search'
import { useEscapeKey, useScrollLock } from '../lib/useScrollLock'
import ImageSlot from './ImageSlot'
import { Overlay, cardStyle } from './ui'

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { books } = useLibrary()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useScrollLock()
  useEscapeKey(onClose)
  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(
    () => books.filter((b) => matchBook(b, query, QUICK_OPTS, ALL_SEARCH_KEYS)).slice(0, 20),
    [books, query],
  )

  return (
    <Overlay onClose={onClose} align="flex-start" paddingTop={110} zIndex={90}>
      <div
        style={{
          ...cardStyle, width: 600, maxWidth: '92vw', maxHeight: '70vh',
          borderRadius: 16, boxShadow: '0 30px 70px oklch(0.1 0.01 50 / 0.4)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالعنوان أو المؤلف…"
            aria-label="ابحث بالعنوان أو المؤلف"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg)',
              fontSize: 15, color: 'var(--text)',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', padding: 8 }}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14 }}>
              لا نتائج مطابقة
            </div>
          ) : (
            results.map((book) => (
              <div
                key={book.id}
                className="row-hover"
                onClick={() => { navigate({ name: 'book', id: book.id }); onClose() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                }}
              >
                <div style={{ width: 38, height: 52, borderRadius: 4, overflow: 'hidden', flex: 'none' }}>
                  <ImageSlot url={book.cover_url} folder="covers" onUploaded={() => {}} canEdit={false} placeholder="" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--heading-font)', fontWeight: 700, fontSize: 14.5,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {book.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {book.author_name} · {book.category}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Overlay>
  )
}
