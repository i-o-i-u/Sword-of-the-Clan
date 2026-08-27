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
  // ثلاثُ صفحاتٍ لا تُعرض في الرأس، ومداخلُها من «تصفُّح المكتبة»
  // و«عن المكتبة». وصفحةُ الشخص الواحد هي صفحةُ المؤلِّف نفسها: سجلُّ
  // الأشخاص واحد، فلا مسارَ ثانٍ له.
  | { name: 'people' }
  | { name: 'series' }
  | { name: 'matns' }
  // «الفوائد والمقتطفات» بابٌ ذو أبواب، فلكلّ بابٍ منها موضعٌ في الرابط
  // يُشارَك ويُعاد إليه — ولولاه لعاد كلُّ رابطٍ إلى صدر السيل.
  | { name: 'perks'; tab?: string }
  | { name: 'perk'; id: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  const [head, id] = path.split('/')
  switch (head) {
    case 'browse': return { name: 'browse' }
    case 'book': return id ? { name: 'book', id } : { name: 'browse' }
    // `#/b/xxxxxx` هو الرابط المختصر: بادئةٌ من معرّف الكتاب لا المعرّف كلّه،
    // وصفحةُ الكتاب تعرف صاحبَها منها. انظر `shortBookLink`.
    case 'b': return id ? { name: 'book', id } : { name: 'browse' }
    case 'authors': return { name: 'authors' }
    case 'author': return id ? { name: 'author', id } : { name: 'authors' }
    case 'add': return { name: 'add' }
    case 'edit': return id ? { name: 'edit', id } : { name: 'browse' }
    case 'publishers': return { name: 'publishers' }
    case 'publisher': return id ? { name: 'publisher', id } : { name: 'publishers' }
    case 'stats': return { name: 'stats' }
    case 'about': return { name: 'about' }
    case 'people': return { name: 'people' }
    case 'series': return { name: 'series' }
    case 'matns': return { name: 'matns' }
    case 'perks': return id ? { name: 'perks', tab: id } : { name: 'perks' }
    case 'perk': return id ? { name: 'perk', id } : { name: 'perks' }
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
    case 'people': return '#/people'
    case 'series': return '#/series'
    case 'matns': return '#/matns'
    case 'perks': return route.tab ? `#/perks/${route.tab}` : '#/perks'
    case 'perk': return `#/perk/${route.id}`
    default: return '#/'
  }
}

/** أقصرُ بادئةٍ تُجرَّب أوّلًا. دونها يكثر التباسُ كتابٍ بكتاب. */
const SHORT_ID_MIN = 6

/**
 * رابطُ الكتاب مختصرًا: معرّفات Convex طويلة (٣٢ حرفًا) ولا تُنسخ في رسالةٍ
 * ولا تُملى، فيُقتطع منها أقصرُ بادئةٍ لا يشاركه فيها كتابٌ آخر — ستّةُ أحرفٍ
 * فأكثر. وصفحةُ الكتاب تقبل البادئة كما تقبل المعرّف التامّ، فلا يضيع رابطٌ
 * قديم. و`ids` معرّفاتُ ما في المكتبة اليوم، بها يُعرف التميُّز.
 */
export function shortBookId(id: string, ids: string[]): string {
  for (let n = SHORT_ID_MIN; n < id.length; n++) {
    const head = id.slice(0, n)
    if (!ids.some((other) => other !== id && other.startsWith(head))) return head
  }
  return id
}

/** الرابط كاملًا كما يُنسخ ويُشارَك، على أصل الموقع ومساره */
export function shortBookLink(id: string, ids: string[]): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/b/${shortBookId(id, ids)}`
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
