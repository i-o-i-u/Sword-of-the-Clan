// حالُ الصفحة كما تركها القارئ: ترشيحُه وبحثُه وترتيبُه وطريقةُ عرضه.
//
// كانت حالًا محلّيّةً في الصفحة (`useState`) تموت بمغادرتها، فمن رشّح الفهرسَ
// بدولابٍ وتصنيفٍ وكتب في البحث ثم فتح كتابًا ورجع، وجد ذلك كلَّه قد محي.
// فصارت تُحفظ ههنا خارج الصفحة: في الذاكرة ما دام اللسانُ مفتوحًا، وفي
// `sessionStorage` فتبقى بعد تحديث الصفحة — ولا تعبر إلى لسانٍ آخر ولا
// إلى زيارةٍ تالية، فلكلّ زيارةٍ فهرسُها من أوّله.

import { useCallback, useEffect, useState, type SetStateAction } from 'react'

const memory = new Map<string, unknown>()
const PREFIX = 'view:'

function read<T>(key: string, init: T): T {
  if (memory.has(key)) return memory.get(key) as T
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw !== null) {
      const value = JSON.parse(raw) as T
      // ما جاء من التخزين لا يُصدَّق إلا إذا كان من جنس أصله
      if (typeof value === typeof init && Array.isArray(value) === Array.isArray(init)) {
        memory.set(key, value)
        return value
      }
    }
  } catch { /* تخزينٌ محجوبٌ أو قيمةٌ محرَّفة: يُبدأ من الأصل */ }
  return init
}

function write(key: string, value: unknown) {
  memory.set(key, value)
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* لا يضرّ */ }
}

/** من يُصغي إلى قيمةٍ كُتبت من خارج صفحتها وهي مفتوحة */
const listeners = new Map<string, Set<(v: unknown) => void>>()

/** كـ`useState`، غير أنّ القيمة تبقى بعد مغادرة الصفحة والعودة إليها */
export function useViewState<T>(key: string, init: T) {
  const [value, setValue] = useState<T>(() => read(key, init))

  useEffect(() => {
    const fn = (v: unknown) => setValue(v as T)
    const set = listeners.get(key) ?? new Set()
    set.add(fn)
    listeners.set(key, set)
    return () => { set.delete(fn) }
  }, [key])

  const set = useCallback((next: SetStateAction<T>) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      write(key, resolved)
      return resolved
    })
  }, [key])
  return [value, set] as const
}

/** يكتب قيمةً لصفحةٍ لم تُفتح بعد — كمن يبحث في اللوحة ثم يطلب نتائجه في الفهرس */
export function presetViewState(key: string, value: unknown) {
  write(key, value)
  // والصفحةُ قد تكون مفتوحةً تحت اللوحة، فتُبلَّغ
  listeners.get(key)?.forEach((fn) => fn(value))
}
