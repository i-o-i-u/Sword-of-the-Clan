import { useEffect, useState } from 'react'

export type View = 'landing' | 'books' | 'visits' | 'borrows'

const VALID_VIEWS: View[] = ['landing', 'books', 'visits', 'borrows']

function readHash(): View {
  const raw = window.location.hash.replace('#/', '').replace('#', '')
  return (VALID_VIEWS as string[]).includes(raw) ? (raw as View) : 'landing'
}

/** توجيه بسيط باستخدام hash الرابط، بلا أي مكتبات خارجية — يلائم النشر
 *  كموقع ثابت على GitHub Pages ويحافظ على إمكانية مشاركة رابط كل صفحة. */
export function useHashView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(readHash)

  useEffect(() => {
    function onHashChange() {
      setView(readHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(v: View) {
    window.location.hash = v === 'landing' ? '/' : `/${v}`
    setView(v)
  }

  return [view, navigate]
}
