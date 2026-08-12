#!/usr/bin/env node
// يحوّل تصدير جدول books من Supabase إلى وسائط دالة migrate:importBooks.
//
//   node scripts/supabase-to-convex.mjs books.json you@example.com
//
// يطبع كائن الوسائط على المخرج القياسي، فيمكن تمريره مباشرة:
//   npx convex run migrate:importBooks "$(node scripts/supabase-to-convex.mjs books.json you@example.com)"

import { readFileSync } from 'node:fs'

const READING_STATUSES = ['لم يُقرأ', 'قيد القراءة', 'انتهى']

const [inputPath, ownerEmail] = process.argv.slice(2)

if (!inputPath || !ownerEmail) {
  console.error('الاستعمال: node scripts/supabase-to-convex.mjs <ملف-التصدير.json> <بريد-صاحب-المكتبة>')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'))
const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : null

if (rows === null) {
  console.error(`تعذّر قراءة ${inputPath}: المتوقَّع مصفوفة صفوف JSON.`)
  process.exit(1)
}

/** يحذف الحقول الفارغة بدل تخزينها نصًّا فارغًا أو null. */
function text(value) {
  if (value === null || value === undefined) return undefined
  const trimmed = String(value).trim()
  return trimmed === '' ? undefined : trimmed
}

const books = rows.map((row, index) => {
  const title = text(row.title)
  if (title === undefined) {
    console.error(`الصفّ رقم ${index + 1}: لا عنوان له — أوقفت التحويل.`)
    process.exit(1)
  }

  let readingStatus = text(row.reading_status ?? row.readingStatus)
  if (readingStatus === undefined || !READING_STATUSES.includes(readingStatus)) {
    console.error(`الصفّ "${title}": حالة قراءة غير معروفة (${readingStatus ?? 'فارغة'}) — ضُبطت على "لم يُقرأ".`)
    readingStatus = 'لم يُقرأ'
  }

  const yearRaw = row.publication_year ?? row.publicationYear
  const year = yearRaw === null || yearRaw === undefined || yearRaw === '' ? undefined : Number(yearRaw)
  if (year !== undefined && !Number.isFinite(year)) {
    console.error(`الصفّ "${title}": سنة نشر غير رقميّة (${yearRaw}) — أُسقطت.`)
  }

  const book = {
    title,
    author: text(row.author),
    category: text(row.category),
    shelfLocation: text(row.shelf_location ?? row.shelfLocation),
    readingStatus,
    publicationYear: year !== undefined && Number.isFinite(year) ? year : undefined,
    notes: text(row.notes),
  }

  // JSON.stringify يُسقط المفاتيح ذات القيمة undefined، وهو المطلوب تمامًا.
  return book
})

console.error(`جاهز: ${books.length} كتابًا.`)
console.log(JSON.stringify({ ownerEmail, books }))
