import { FormEvent, useState } from 'react'
import { Book, BookInput, READING_STATUSES } from '../lib/types'

interface Props {
  initialBook?: Book | null
  onSave: (input: BookInput) => Promise<void>
  onCancel: () => void
}

export default function BookForm({ initialBook, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initialBook?.title ?? '')
  const [author, setAuthor] = useState(initialBook?.author ?? '')
  const [category, setCategory] = useState(initialBook?.category ?? '')
  const [shelfLocation, setShelfLocation] = useState(initialBook?.shelf_location ?? '')
  const [readingStatus, setReadingStatus] = useState(initialBook?.reading_status ?? 'لم يُقرأ')
  const [publicationYear, setPublicationYear] = useState(
    initialBook?.publication_year ? String(initialBook.publication_year) : ''
  )
  const [notes, setNotes] = useState(initialBook?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        author: author.trim() || null,
        category: category.trim() || null,
        shelf_location: shelfLocation.trim() || null,
        reading_status: readingStatus as Book['reading_status'],
        publication_year: publicationYear ? Number(publicationYear) : null,
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form
        className="modal-card"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{initialBook ? 'تعديل كتاب' : 'إضافة كتاب جديد'}</h2>

        <label className="field">
          <span>العنوان *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="field">
          <span>المؤلف</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>التصنيف</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>

          <label className="field">
            <span>رقم الرفّ / الموقع</span>
            <input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>حالة القراءة</span>
            <select value={readingStatus} onChange={(e) => setReadingStatus(e.target.value as Book['reading_status'])}>
              {READING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>سنة النشر</span>
            <input
              type="number"
              value={publicationYear}
              onChange={(e) => setPublicationYear(e.target.value)}
              min={0}
              max={2100}
            />
          </label>
        </div>

        <label className="field">
          <span>ملاحظات</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '...جارٍ الحفظ' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  )
}
