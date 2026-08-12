import { ConvexError } from 'convex/values'

/** يستخرج رسالة عربية مفهومة من خطأ Convex بدل تسريب أثر التنفيذ. */
export function errorText(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === 'string') {
    return error.data
  }
  return fallback
}
