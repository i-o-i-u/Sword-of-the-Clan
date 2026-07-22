import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Visit, VisitInput } from '../lib/types'
import VisitForm from '../components/VisitForm'

export default function VisitsLog() {
  const { session, requireAuth } = useAuth()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadVisits()
  }, [])

  async function loadVisits() {
    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg('تعذّر تحميل سجلّ الزيارات: ' + error.message)
    } else {
      setVisits(data ?? [])
    }
    setLoading(false)
  }

  async function openAddForm() {
    const ok = await requireAuth()
    if (ok) setShowForm(true)
  }

  async function handleSave(input: VisitInput) {
    const { error } = await supabase.from('visits').insert({ ...input, user_id: session!.user.id })
    if (error) {
      setErrorMsg('تعذّر تسجيل الزيارة: ' + error.message)
      return
    }
    setShowForm(false)
    await loadVisits()
  }

  async function handleDelete(visit: Visit) {
    const ok = await requireAuth()
    if (!ok) return
    if (!confirm(`هل تريد حذف زيارة "${visit.visitor_name}"؟`)) return
    const { error } = await supabase.from('visits').delete().eq('id', visit.id)
    if (error) {
      setErrorMsg('تعذّر حذف الزيارة: ' + error.message)
      return
    }
    await loadVisits()
  }

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>📝 سجلّ الزيارات</h1>
        <button className="btn btn-primary" onClick={openAddForm}>
          + تسجيل زيارة
        </button>
      </div>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {loading ? (
        <p>...جاري التحميل</p>
      ) : visits.length === 0 ? (
        <p className="empty-state">لا توجد زيارات مسجَّلة بعد.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الزائر</th>
                <th>التاريخ</th>
                <th>الغرض</th>
                <th>ملاحظات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{v.visitor_name}</td>
                  <td>{v.visit_date}</td>
                  <td>{v.purpose || '—'}</td>
                  <td className="notes-cell">{v.notes || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(v)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <VisitForm onSave={handleSave} onCancel={() => setShowForm(false)} />}
    </div>
  )
}
