// قفل تمرير الصفحة خلف الطبقات المعتمة (§١١/٣).
// القفل مربوطٌ بعمر المكوّن، فيُفَكّ من كل طريقٍ يُغلق الطبقة: زر الإغلاق،
// والنقر خارجها، والانتقال إلى صفحة أخرى، واختيار نتيجة من البحث.

import { useEffect } from 'react'

export function useScrollLock() {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
}

/** يُغلق الطبقة بمفتاح الهروب */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onEscape])
}
