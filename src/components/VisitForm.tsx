import { FormEvent, useState } from 'react'
import { VisitInput } from '../lib/types'

interface Props {
  onSave: (input: VisitInput) => Promise<void>
  onCancel: () => void
}

export default function VisitForm({ onSave, onCancel }: Props) {
  const [visitorName, setVisitorName] = useState('')
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        visitor_name: visitorName.trim(),
        visit_date: visitDate,
        purpose: purpose.trim() || null,
        notes: notes.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal-card" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2>تسجيل زيارة جديدة</h2>

        <label className="field">
          <span>اسم الزائر *</span>
          <input value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
        </label>

        <div className="field-row">
          <label className="field">
            <span>تاريخ الزيارة</span>
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </label>

          <label className="field">
            <span>الغرض من الزيارة</span>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '...جارٍ الحفظ' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  )
}
