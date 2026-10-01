// تصغيرُ الصورة قبل رفعها.
//
// كانت الصورةُ تُرفع كما خرجت من الهاتف — أربعةُ ميغابايتاتٍ وستّة — ثم
// تُعرض في بطاقةٍ عرضُها مئةٌ وثمانون بكسلًا، فيُنزِّل الزائرُ الصورةَ كاملةً
// لكل كتابٍ في الشبكة. وهو أثقلُ ما في الموقع متى امتلأ الفهرس.
//
// فتُصغَّر ههنا في المتصفّح إلى حدٍّ يكفي أكبرَ موضعٍ تُعرض فيه — مع شاشات
// الكثافة المضاعفة وعارض التكبير — وتُرمَّز WebP. وما كان أصغرَ من ذلك أو
// خرج بعد الترميز أثقلَ من أصله يُرفع كما هو: التصغيرُ لا يُفسد صورةً جيّدة.
//
// حسابٌ محضٌ في المتصفّح، لا يمسّ Convex؛ والرفعُ نفسُه في `api.ts`.

/** أطولُ ضلعٍ يُبقى عليه، بحسب موضع الصورة */
const MAX_SIDE: Record<string, number> = {
  covers: 1400,
  spines: 1400,
  publishers: 600,
  landing: 2400,
}
const DEFAULT_MAX = 1600

/** ما لا يُصغَّر: الرسمُ المتّجه والمتحرّك يفسدهما التحويل */
const KEEP = new Set(['image/svg+xml', 'image/gif'])

export async function shrinkImage(file: File, folder: string): Promise<Blob> {
  if (KEEP.has(file.type) || typeof createImageBitmap !== 'function') return file
  const max = MAX_SIDE[folder] ?? DEFAULT_MAX

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  // الصورةُ الصغيرة الخفيفة لا تُعاد ترميزًا: لا كسبَ فيه
  if (scale === 1 && file.size < 400_000) {
    bitmap.close()
    return file
  }

  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/webp', 0.86))
  // متصفّحٌ لا يُرمِّز WebP يعيد PNG ثقيلًا، فيُترك الأصل
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
  return blob
}
