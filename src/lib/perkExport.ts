// الكرّاسةُ مرتَّبةً ومُصدَّرة.
//
// الكرّاسةُ مسألةٌ جُمع لها المتفرِّق، فهي بحثٌ مصغَّر — وللبحث ترتيبٌ وفصول،
// ويُخرَج من المكتبة إلى مستندٍ يُكمَل فيه أو يُنشر. فههنا:
//   • **ترتيبُها** (`notebookEntries`): فوائدُها على ما رتّبها صاحبُها، وبينها
//     عناوينُ فصول. والترتيبُ في `layout` والعضويّةُ في `perk.notebook_ids`،
//     فما في الكرّاسة وليس في الترتيب يُلحق بآخره على تاريخ تقييده.
//   • **تصديرُها** مستندًا يفتحه «وورد» (`notebookDoc`) أو نصَّ Markdown
//     (`notebookMarkdown`) — لمدوّنة صاحب المكتبة. والطباعةُ وحفظُ PDF في
//     `PerkPrint`.

import { perkCitation } from './citation'
import { escapeHtml, orderedFootnotes, sanitizeHtml, layoutPoemsHtml } from './richtext'
import { LIBRARY_NAME, type Author, type Book, type Notebook, type NotebookEntry, type Perk } from './types'

/**
 * تعليقُ المُقيِّد بلا «قلتُ» في أوّله: هي صدرُه في كل عرضٍ (`PerkComment`)،
 * فإن كُتبت في الحقل تكرّرت.
 */
function bareComment(text: string): string {
  return text.replace(/^\s*قلت[\u064B-\u0652]*\s*[:：،,]?\s*/, '').trim()
}

/** صفٌّ من الكرّاسة كما يُعرض: فائدةٌ، أو عنوانُ فصل */
export type NotebookItem =
  | { kind: 'perk'; perk: Perk }
  | { kind: 'heading'; text: string }

/**
 * الكرّاسةُ على ترتيبها. ما في الترتيب لفائدةٍ خرجت منها يسقط، وما فيها وليس
 * في الترتيب يُلحق بآخره — فلا يفترق الموضعان ولا يُفسد أحدُهما الآخر.
 */
export function notebookEntries(notebook: Notebook, perks: Perk[]): NotebookItem[] {
  const inside = perks.filter((p) => p.notebook_ids.includes(notebook.id))
  const byId = new Map(inside.map((p) => [p.id, p]))
  const placed = new Set<string>()
  const out: NotebookItem[] = []
  for (const e of notebook.layout ?? []) {
    if (e.perk_id) {
      const perk = byId.get(e.perk_id)
      if (perk && !placed.has(perk.id)) {
        out.push({ kind: 'perk', perk })
        placed.add(perk.id)
      }
    } else if (e.heading?.trim()) {
      out.push({ kind: 'heading', text: e.heading.trim() })
    }
  }
  for (const p of inside) if (!placed.has(p.id)) out.push({ kind: 'perk', perk: p })
  return out
}

/** الترتيبُ كما يُحفظ: من صفوف العرض إلى صفوف `layout` */
export function toLayout(items: NotebookItem[]): NotebookEntry[] {
  return items.map((i) => (i.kind === 'perk' ? { perk_id: i.perk.id } : { heading: i.text }))
}

interface Ctx {
  bookById: (id: string) => Book | undefined
  authorById: (id: string | null) => Author | null
}

function citeOf(perk: Perk, ctx: Ctx): string {
  const book = perk.book_id ? ctx.bookById(perk.book_id) : undefined
  const author = book ? ctx.authorById(book.author_id) : null
  return perkCitation(perk, book, author, false)
}

/** نصُّ الفائدة منسَّقًا للمستند: مشذَّبًا، والشعرُ مصفوفًا، والهوامشُ تحته */
function perkHtml(perk: Perk): string {
  const body = perk.text_html.trim()
    ? layoutPoemsHtml(sanitizeHtml(perk.text_html))
    : perk.text.split('\n').map((l) => `<p>${escapeHtml(l)}</p>`).join('')
  const notes = orderedFootnotes(body, perk.footnotes)
  // المِسماكُ ورقمُ البيت في المستند رقمٌ مكتوب: «وورد» لا يعرف عدَّ ملف الأنماط
  let n = 0
  const numbered = numberVerses(body)
    .replace(/<sup[^>]*class="fn"[^>]*><\/sup>/g, () => `<sup>${++n}</sup>`)
  const list = notes.length
    ? `<ol class="notes">${notes.map((f) => `<li>${escapeHtml(f.text)}</li>`).join('')}</ol>`
    : ''
  return numbered + list
}

/** يكتب رقمَ كل بيتٍ في خليّته، ويرفع الخليّةَ من البيت الواحد */
function numberVerses(html: string): string {
  if (!html.includes('bayt-no')) return html
  const body = new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html').body
  body.querySelectorAll('table').forEach((table) => {
    const cells = [...table.querySelectorAll('td.bayt-no')]
    if (cells.length < 2) cells.forEach((c) => c.remove())
    else cells.forEach((c, i) => { c.textContent = String(i + 1) })
  })
  return body.innerHTML
}

/**
 * الكرّاسةُ مستندًا يفتحه «وورد»: HTML بترويسة «وورد» واتّجاهٍ من اليمين،
 * يُنزَّل بامتداد `.doc` فيُفتح ويُحرَّر ويُحفظ بصيغته. والشعرُ جدولٌ كما هو
 * في المكتبة، والعزوُ تحت كل فائدة.
 */
export function notebookDoc(notebook: Notebook, items: NotebookItem[], ctx: Ctx): string {
  const parts = items.map((i) => (i.kind === 'heading'
    ? `<h2>${escapeHtml(i.text)}</h2>`
    : `<div class="perk">${i.perk.title ? `<h3>${escapeHtml(i.perk.title)}</h3>` : ''}${perkHtml(i.perk)}`
      + (i.perk.comment
        ? `<p class="comment"><b>قلتُ:</b> ${escapeHtml(bareComment(i.perk.comment))}</p>`
        : '')
      + `<p class="cite">${escapeHtml(citeOf(i.perk, ctx))}</p></div>`))
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtml(notebook.name)}</title>
<style>
body { direction: rtl; font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 15pt; line-height: 1.9; }
h1 { font-size: 22pt; margin: 0 0 6pt; }
h2 { font-size: 17pt; margin: 18pt 0 8pt; color: #7a4b2e; border-bottom: 1px solid #d8ccbb; }
h3 { font-size: 15pt; margin: 12pt 0 4pt; }
p { text-align: justify; margin: 0 0 6pt; }
.perk { margin-bottom: 14pt; }
.cite { font-size: 12pt; color: #6b655c; }
.comment { border-right: 3px solid #b0413e; padding-right: 8pt; }
table { margin: 6pt auto; border-collapse: collapse; }
td { padding: 2pt 14pt; }
.notes { font-size: 12pt; color: #57524a; }
.kicker { color: #6b655c; font-size: 12pt; }
</style></head>
<body>
<p class="kicker">${escapeHtml(LIBRARY_NAME)} — كرّاسةٌ من كنّاش المكتبة</p>
<h1>${escapeHtml(notebook.name)}</h1>
${notebook.note.trim() ? `<p>${escapeHtml(notebook.note.trim())}</p>` : ''}
${parts.join('\n')}
</body></html>`
}

/**
 * الكرّاسةُ Markdown: لمن ينشرها في مدوّنته. والشعرُ على علامته في المكتبة
 * (`صدرٌ * عَجُز`) فيُعرف ويُعاد صفُّه، والهوامشُ قائمةٌ مرقَّمة تحت نصّها.
 */
export function notebookMarkdown(notebook: Notebook, items: NotebookItem[], ctx: Ctx): string {
  const out: string[] = [`# ${notebook.name}`, '']
  if (notebook.note.trim()) out.push(notebook.note.trim(), '')
  for (const i of items) {
    if (i.kind === 'heading') { out.push(`## ${i.text}`, ''); continue }
    const p = i.perk
    if (p.title) out.push(`### ${p.title}`, '')
    out.push(p.text.trim(), '')
    // والهوامشُ قائمةٌ تحت نصّها: النصُّ المجرَّد لا يحمل مِسماكاتها
    const notes = orderedFootnotes(p.text_html, p.footnotes).filter((f) => f.text.trim())
    if (notes.length) {
      out.push('**الهوامش:**', '')
      notes.forEach((f, n) => out.push(`${n + 1}. ${f.text.trim()}`))
      out.push('')
    }
    if (p.comment) out.push(`> **قلتُ:** ${bareComment(p.comment)}`, '')
    out.push(`— ${citeOf(p, ctx)}`, '')
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/** اسمُ الملفّ من اسم الكرّاسة: بلا ما تمنعه أنظمةُ الملفّات */
export function fileName(name: string, ext: string): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'كرّاسة'
  return `${base}.${ext}`
}
