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
  // يُشارَك ويُعاد إليه — ولولاه لعاد كلُّ رابطٍ إلى صدر القسم.
  //
  // **وما رُشِّح به كذلك**: من ضغط عَلَمًا أو كرّاسةً أو مصدرًا فقد قصد
  // موضعًا بعينه من الكنّاش، فحقُّه أن يُشارَك ويُعاد إليه كما يُشارَك الباب.
  // وأمّا البحثُ والنفاسةُ والترتيبُ فحالُ القارئ في لحظته لا موضعٌ يُقصد،
  // فلا تُكتب في الرابط ولا يُثقَل بها.
  | { name: 'perks'; tab?: string; pick?: { field: string; value: string } }
  | { name: 'perk'; id: string }
  // والكرّاسةُ صفحةٌ بنفسها: منها تُضاف الفوائدُ الداخلة فيها
  | { name: 'notebook'; id: string }

/** ما يُرشَّح به الكنّاش من الرابط، ويُكتب فيه. انظر `Route.perks`. */
const PERK_PICKS = ['kind', 'category', 'subCategory', 'person', 'notebook', 'tag', 'source']

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const path = raw.split('?')[0]
  const [head, id] = path.split('/')

  if (head === 'perks') {
    const params = new URLSearchParams(raw.split('?')[1] ?? '')
    const field = PERK_PICKS.find((k) => params.get(k))
    return {
      name: 'perks',
      ...(id ? { tab: id } : {}),
      ...(field ? { pick: { field, value: params.get(field)! } } : {}),
    }
  }

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
    case 'perk': return id ? { name: 'perk', id } : { name: 'perks' }
    case 'notebook': return id ? { name: 'notebook', id } : { name: 'perks', tab: 'notebooks' }
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
    case 'perks': {
      const base = route.tab ? `#/perks/${route.tab}` : '#/perks'
      if (!route.pick?.value) return base
      return `${base}?${route.pick.field}=${encodeURIComponent(route.pick.value)}`
    }
    case 'perk': return `#/perk/${route.id}`
    case 'notebook': return `#/notebook/${route.id}`
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

// ---------------------------------------------------------------- الانتقال
//
// ثلاثُ خصالٍ في الانتقال لم تكن:
//
//  ١. **موضعُ القارئ يُحفظ ويُردّ إليه بالرجوع.** كان كلُّ تبدُّلٍ في الرابط
//     يصعد بالصفحة إلى أعلاها، فمن تصفّح الفهرس إلى منتصفه ثم فتح كتابًا
//     ورجع، وجد الفهرسَ من أوّله. فالآن يُحفظ موضعُ كل رابطٍ ساعةَ يُغادَر،
//     فإن رُجع إليه بزرّ الرجوع رُدَّ القارئُ إليه، وإن قُصد قصدًا جديدًا
//     بدأ من أعلاه.
//  ٢. **الرجوعُ رجوعٌ حقًّا** (`goBack`): زرُّ «العودة» في الصفحات كان ينتقل
//     إلى صفحةٍ مسمّاة، فيكتب في التاريخ خطوةً جديدة ولا يردّ ما كان.
//  ٣. **حارسُ المغادرة** (`setLeaveGuard`): نموذجٌ فيه ما لم يُحفظ يُسأل
//     صاحبُه قبل أن يغادره، بزرٍّ في الرأس كان أو بزرّ الرجوع في المتصفّح.

/** موضعُ التمرير لكل رابطٍ ساعةَ غادره القارئ */
const scrollMemory = new Map<string, number>()

/** الانتقالُ القادم قصدٌ جديد لا رجوع: يبدأ من أعلى الصفحة */
let freshNavigation = false

/** كم خطوةً خطاها القارئُ داخل الموقع: بها يُعرف أفي التاريخ ما يُرجَع إليه */
let depth = 0

/** حارسُ المغادرة: يُسأل قبل كل انتقال، فإن أعاد `false` بقي القارئُ حيث هو */
let leaveGuard: (() => boolean) | null = null

export function setLeaveGuard(guard: (() => boolean) | null) {
  leaveGuard = guard
}

/**
 * يحرس صفحةً فيها ما لم يُحفظ: ما دام `active` سُئل القارئُ قبل أن يغادرها
 * — بانتقالٍ في الموقع، أو بزرّ الرجوع، أو بإغلاق اللسان وتحديثه.
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return
    setLeaveGuard(() => window.confirm(message))
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      setLeaveGuard(null)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [active, message])
}

export function navigate(route: Route) {
  if (leaveGuard && !leaveGuard()) return
  const target = hashFor(route)
  freshNavigation = true
  if (window.location.hash !== target) {
    depth++
    window.location.hash = target
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}

/**
 * يرجع خطوةً في التاريخ إن كانت قبلها خطوةٌ في الموقع، وإلا انتقل إلى
 * `fallback`: من دخل صفحةَ كتابٍ من رابطٍ أُرسل إليه لا يُرجَع به خارج الموقع.
 */
export function goBack(fallback: Route) {
  if (depth > 0) {
    if (leaveGuard && !leaveGuard()) return
    // الحارسُ سُئل ههنا، فلا يُسأل مرّةً ثانية حين يتبدّل الرابط. والصفحةُ
    // التي نصبته ترفعه عند مغادرتها، فلا يُردّ.
    leaveGuard = null
    window.history.back()
  } else {
    navigate(fallback)
  }
}

/**
 * خصائصُ رابطٍ إلى مسار: `href` حقيقيّ — فيُفتح في لسانٍ جديد بالزرّ الأوسط
 * ويُنسخ ويُبلَغ بلوحة المفاتيح — ونقرٌ عاديّ يمرّ بـ`navigate`.
 */
export function linkTo(route: Route) {
  return {
    href: hashFor(route),
    onClick: (e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; button?: number }) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return
      e.preventDefault()
      navigate(route)
    },
  }
}

/** ما يحتاجه عنصرٌ يُنقر وليس رابطًا ولا زرًّا (صفُّ جدول): تركيزٌ ومفتاحان */
export function pressable(onPress: () => void, role: 'link' | 'button' = 'link') {
  return {
    role,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Enter' || (role === 'button' && e.key === ' ')) {
        e.preventDefault()
        onPress()
      }
    },
  }
}

/** يُردّ القارئُ إلى موضعه بعد أن تُرسم الصفحة — وقد تحتاج رسمتين أو ثلاثًا */
function restoreScroll(y: number) {
  let tries = 0
  const step = () => {
    window.scrollTo({ top: y })
    // الصفحةُ لم تبلغ طولَها بعد (قطعةٌ تُجلب، أو قائمةٌ تُرسم على دفعات)
    if (Math.abs(window.scrollY - y) > 2 && tries++ < 30) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = (e: Event) => {
      const old = (e as HashChangeEvent).oldURL
      const oldHash = old ? new URL(old).hash : ''

      // الرجوعُ بزرّ المتصفّح يمرّ بالحارس كذلك. ولا يُلغى تبدُّلُ الرابط،
      // فيُعاد الرابطُ إلى ما كان عليه بلا انتقال — والصفحةُ لم تتبدّل أصلًا
      if (!freshNavigation && leaveGuard && !leaveGuard()) {
        window.history.pushState(null, '', old)
        depth++
        return
      }

      if (oldHash !== window.location.hash) scrollMemory.set(oldHash, window.scrollY)
      setRoute(parseHash(window.location.hash))

      const saved = scrollMemory.get(window.location.hash)
      if (!freshNavigation && saved !== undefined) {
        // رجوعٌ أو تقدُّمٌ في التاريخ: يُردّ القارئُ إلى حيث كان
        restoreScroll(saved)
      } else {
        window.scrollTo({ top: 0 })
      }
      if (!freshNavigation && depth > 0) depth--
      freshNavigation = false
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
