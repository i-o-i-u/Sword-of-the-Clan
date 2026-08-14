// موجِّه بسيط بعنوان التجزئة (#/…). اخترناه لأن الموقع يُنشر على GitHub Pages،
// فلا يحتاج إعادة كتابة المسارات في الخادم، ويبقى لكل كتابٍ ومؤلِّفٍ رابطٌ يُشارَك.

import { useEffect, useState } from 'react'

export type Route =
  | { name: 'landing' }
  | { name: 'browse' }
  | { name: 'book'; id: string }
  | { name: 'authors' }
  | { name: 'author'; id: string }
  | { name: 'add' }
  | { name: 'edit'; id: string }
  | { name: 'publishers' }
  | { name: 'publisher'; id: string }
  | { name: 'stats' }
  | { name: 'about' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  const [head, id] = path.split('/')
  switch (head) {
    case 'browse': return { name: 'browse' }
    case 'book': return id ? { name: 'book', id } : { name: 'browse' }
    case 'authors': return { name: 'authors' }
    case 'author': return id ? { name: 'author', id } : { name: 'authors' }
    case 'add': return { name: 'add' }
    case 'edit': return id ? { name: 'edit', id } : { name: 'browse' }
    case 'publishers': return { name: 'publishers' }
    case 'publisher': return id ? { name: 'publisher', id } : { name: 'publishers' }
    case 'stats': return { name: 'stats' }
    case 'about': return { name: 'about' }
    default: return { name: 'landing' }
  }
}

export function hashFor(route: Route): string {
  switch (route.name) {
    case 'browse': return '#/browse'
    case 'book': return `#/book/${route.id}`
    case 'authors': return '#/authors'
    case 'author': return `#/author/${route.id}`
    case 'add': return '#/add'
    case 'edit': return `#/edit/${route.id}`
    case 'publishers': return '#/publishers'
    case 'publisher': return `#/publisher/${route.id}`
    case 'stats': return '#/stats'
    case 'about': return '#/about'
    default: return '#/'
  }
}

export function navigate(route: Route) {
  const target = hashFor(route)
  if (window.location.hash !== target) window.location.hash = target
  else window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
