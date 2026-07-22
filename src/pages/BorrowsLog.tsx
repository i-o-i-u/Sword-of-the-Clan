import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Borrow, BorrowInput } from '../lib/types'
import BorrowForm from '../components/BorrowForm'

export default function BorrowsLog() {
  const { session, requireAuth } = useAuth()
  const [borrows, setBorrows] = useState<Borrow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'الكل' | 'مستعار' | 'تم الإرجاع'>('الكل')

  useEffect(() => {
    loadBorrows()
  }, [])

  async function loadBorrows() {
    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('borrows')
      .select('*')
      .order('borrow_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg('تعذّر تحميل سجلّ الاستعارات: ' + error.message)
    } else {
      setBorrows(data ?? [])
    }
    setLoading(false)
  }

  async function openAddForm() {
    const ok = await requireAuth()
    if (ok) setShowForm(true)
  }

  async function handleSave(input: BorrowInput) {
    const { error } = await supabase.from('borrows').insert({ ...input, user_id: session!.user.id })
    if (error) {
      setErrorMsg('تعذّر تسجيل الاستعارة: ' + error.message)
      return
    }
    setShowForm(false)
    await loadBorrows()
  }

  async function handleMarkReturned(borrow: Borrow) {
    const ok = await requireAuth()
    if (!ok) return
    const { error } = await supabase
      .from('borrows')
      .update({ status: 'تم الإرجاع', return_date: new Date().toISOString().slice(0, 10) })
      .eq('id', borrow.id)
    if (error) {
      setErrorMsg('تعذّر تحديث حالة الاستعارة: ' + error.message)
      return
    }
    await loadBorrows()
  }

  async function handleDelete(borrow: Borrow) {
    const ok = await requireAuth()
    if (!ok) return
    if (!confirm(`هل تريد حذف سجلّ استعارة "${borrow.book_title_snapshot}"؟`)) return
    const { error } = await supabase.from('borrows').delete().eq('id', borrow.id)
    if (error) {
      setErrorMsg('تعذّر حذف السجلّ: ' + error.message)
      return
    }
    await loadBorrows()
  }

  const filteredBorrows = useMemo(() => {
    if (statusFilter === 'الكل') return borrows
    return borrows.filter((b) => b.status === statusFilter)
  }, [borrows, statusFilter])

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>🔄 سجلّ الاستعارات</h1>
        <button className="btn btn-primary" onClick={openAddForm}>
          + تسجيل استعارة
        </button>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="الكل">الكل</option>
          <option value="مستعار">مستعار حاليًا</option>
          <option value="تم الإرجاع">تم الإرجاع</option>
        </select>
      </div>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {loading ? (
        <p>...جاري التحميل</p>
      ) : filteredBorrows.length === 0 ? (
        <p className="empty-state">لا توجد استعارات مطابقة.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>الكتاب</th>
                <th>المستعير</th>
                <th>تاريخ الاستعارة</th>
                <th>موعد الإرجاع</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBorrows.map((b) => (
                <tr key={b.id}>
                  <td>{b.book_title_snapshot}</td>
                  <td>{b.borrower_name}</td>
                  <td>{b.borrow_date}</td>
                  <td>{b.due_date || '—'}</td>
                  <td>
                    <span className={`status-badge status-${b.status === 'مستعار' ? 'reading' : 'done'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {b.status === 'مستعار' && (
                      <button className="btn btn-small" onClick={() => handleMarkReturned(b)}>
                        تسجيل الإرجاع
                      </button>
                    )}
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(b)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <BorrowForm onSave={handleSave} onCancel={() => setShowForm(false)} />}
    </div>
  )
}
