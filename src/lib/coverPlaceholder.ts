// يولّد غلافًا بديلاً متناسقًا للكتب التي لا تملك صورة غلاف حقيقية،
// بلونٍ مشتقّ من عنوان الكتاب ليبقى ثابتًا لكل كتاب دون أي طلب شبكة.
const PALETTE = [
  ['#6b4226', '#3f2717'],
  ['#8a5a34', '#513418'],
  ['#4e2f1a', '#2c1a0e'],
  ['#7a5c3e', '#42311d'],
  ['#5f3d24', '#33210f'],
  ['#9c6b3f', '#5a3c1f'],
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function coverPalette(title: string): [string, string] {
  const idx = hashString(title) % PALETTE.length
  return PALETTE[idx] as [string, string]
}

export function coverInitial(title: string): string {
  const trimmed = title.trim()
  return trimmed ? trimmed[0] : '📕'
}
