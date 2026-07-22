import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Book, BorrowInput } from '../lib/types'

interface Props {
  onSave: (input: BorrowInput) => Promise<void>
  onCancel: () => void
}

export default function BorrowForm({ onSave, onCancel }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState('')
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true })
      .then(({ data }) => setBooks(data ?? []))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const book = books.find((b) => b.id === bookId)
    if (!book) return
    setSaving(true)
    try {
      await onSave({
        book_id: book.id,
        book_title_snapshot: book.title,
        borrower_name: borrowerName.trim(),
        borrow_date: borrowDate,
        due_date: dueDate || null,
        return_date: null,
        status: 'مستعار',
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal-card" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2>تسجيل استعارة جديدة</h2>

        <label className="field">
          <span>الكتاب *</span>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)} required>
            <option value="" disabled>
              اختر كتابًا...
            </option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>اسم المستعير *</span>
          <input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} required />
        </label>

        <div className="field-row">
          <label className="field">
            <span>تاريخ الاستعارة</span>
            <input type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
          </label>

          <label className="field">
            <span>موعد الإرجاع المتوقّع</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>ملاحظات</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !bookId}>
            {saving ? '...جارٍ الحفظ' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  )
}
