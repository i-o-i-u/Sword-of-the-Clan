// سجلُّ الأشخاص واحد: جدولُ `authors` نفسه يحمل المؤلِّفَ والمحقِّقَ ومن على
// صفتهما. فالشيخ محمود شاكر — رحمه الله — حقّق وألّف، فله سجلٌّ واحد وصفحةٌ
// واحدة تُجمع فيها تحقيقاتُه ومؤلَّفاتُه، لا سجلّان تُكرَّر بينهما وفاتُه
// وترجمتُه.
//
// وهذه الدوالُّ تقرأ الصفاتِ من الكتب نفسها: أين ذُكر الرجلُ وبأيّ صفة.

import { AUTHOR_ROLE, CONTRIBUTOR_ROLES, ROLE_RANK, type Book } from './types'

/** كتبُ الرجل مقسومةً بصفته فيها، على ترتيب الصفات المعتمَد */
export interface RoleWorks {
  role: string
  books: Book[]
}

/**
 * ترتيبُ الصفة: ما كان في `CONTRIBUTOR_ROLES` فبموضعه منها، وما استُجدّ
 * فبعدها. فترتيبُ العرض واحدٌ في كل صفحة.
 */
function roleOrder(role: string): number {
  const i = CONTRIBUTOR_ROLES.indexOf(role)
  return i === -1 ? CONTRIBUTOR_ROLES.length : i
}

/** ما ألَّفه الرجل: كتبٌ هو مؤلِّفُها الأول أو شارَك في تأليفها */
export function authoredBooks(books: Book[], personId: string): Book[] {
  return books.filter(
    (b) => b.author_id === personId
      || (b.co_authors ?? []).some((c) => c.author_id === personId),
  )
}

/** ما عمل فيه الرجل بصفةٍ غير التأليف، مقسومًا بصفاته */
export function contributedBooks(books: Book[], personId: string): RoleWorks[] {
  const map = new Map<string, Book[]>()
  for (const book of books) {
    for (const c of book.contributors ?? []) {
      if (c.person_id !== personId) continue
      const list = map.get(c.role) ?? []
      // الرجلُ قد يُذكر مرَّتين في الكتاب الواحد بصفةٍ واحدة — لنطاقين من
      // مجلَّداته — فلا يُعدّ الكتابُ له مرَّتين
      if (!list.includes(book)) list.push(book)
      map.set(c.role, list)
    }
  }
  return [...map.entries()]
    .map(([role, list]) => ({ role, books: list }))
    .sort((a, b) => roleOrder(a.role) - roleOrder(b.role))
}

/**
 * أعلى صفةٍ سُجِّلت للرجل في المكتبة، على ترتيب `ROLE_RANK`.
 *
 * فمن له تأليفٌ واحد فهو مؤلِّفٌ أبدًا وإن كثُرت تحقيقاتُه، ومن حقّق واعتنى
 * فهو محقِّق. وبها يُنعَت نعتًا مفردًا حيث لا يسع المقامُ تعدادَ صفاته.
 * ولا تُسقط هذه الرتبةُ ما دونها: أعمالُه تُقسَم بصفاته كلِّها، ويُعرض في
 * صفِّ كلٍّ منها.
 *
 * وترجع فارغةً لمن لا عمل له في المكتبة أصلًا.
 */
export function topRole(books: Book[], personId: string): string | null {
  if (authoredBooks(books, personId).length > 0) return AUTHOR_ROLE

  const has = new Set(
    books.flatMap((b) => (b.contributors ?? [])
      .filter((c) => c.person_id === personId)
      .map((c) => c.role)),
  )
  return ROLE_RANK.find((r) => has.has(r)) ?? null
}

/** هل لهذا الرجل في المكتبة عملٌ بصفةٍ غير التأليف؟ */
export function hasContributions(books: Book[], personId: string): boolean {
  return books.some((b) => (b.contributors ?? []).some((c) => c.person_id === personId))
}

/**
 * أصحابُ كل صفة في المكتبة: مفتاحُه الصفة، وقيمتُه معرّفاتُ أصحابها بلا
 * تكرار. وما لا سجلَّ له — اسمٌ كُتب قبل أن يُربط بشخص — يسقط، فلا صفحة له.
 */
export function peopleByRole(books: Book[]): RolePeople[] {
  const map = new Map<string, Set<string>>()
  for (const book of books) {
    for (const c of book.contributors ?? []) {
      if (!c.person_id) continue
      if (!map.has(c.role)) map.set(c.role, new Set())
      map.get(c.role)!.add(c.person_id)
    }
  }
  return [...map.entries()]
    .map(([role, ids]) => ({ role, ids: [...ids] }))
    .sort((a, b) => roleOrder(a.role) - roleOrder(b.role))
}

export interface RolePeople {
  role: string
  ids: string[]
}
