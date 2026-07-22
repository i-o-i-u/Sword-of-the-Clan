import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Book, BookInput, READING_STATUSES } from '../lib/types'
import BookForm from '../components/BookForm'

interface Props {
  session: Session
}

export default function Home({ session }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('الكل')
  const [statusFilter, setStatusFilter] = useState('الكل')

  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg('تعذّر تحميل الكتب: ' + error.message)
    } else {
      setBooks(data ?? [])
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleSave(input: BookInput) {
    if (editingBook) {
      const { error } = await supabase.from('books').update(input).eq('id', editingBook.id)
      if (error) {
        setErrorMsg('تعذّر تعديل الكتاب: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('books')
        .insert({ ...input, user_id: session.user.id })
      if (error) {
        setErrorMsg('تعذّر إضافة الكتاب: ' + error.message)
        return
      }
    }
    setShowForm(false)
    setEditingBook(null)
    await loadBooks()
  }

  async function handleDelete(book: Book) {
    if (!confirm(`هل تريد حذف كتاب "${book.title}"؟`)) return
    const { error } = await supabase.from('books').delete().eq('id', book.id)
    if (error) {
      setErrorMsg('تعذّر حذف الكتاب: ' + error.message)
      return
    }
    await loadBooks()
  }

  const categories = useMemo(() => {
    const set = new Set(books.map((b) => b.category).filter(Boolean) as string[])
    return ['الكل', ...Array.from(set).sort()]
  }, [books])

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return books.filter((b) => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'الكل' || b.category === categoryFilter
      const matchesStatus = statusFilter === 'الكل' || b.reading_status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [books, search, categoryFilter, statusFilter])

  return (
    <div className="page">
      <header className="app-header">
        <h1>📚 مكتبة سيف العشيرة</h1>
        <div className="header-actions">
          <span className="user-email">{session.user.email}</span>
          <button className="btn" onClick={handleSignOut}>
            تسجيل الخروج
          </button>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="ابحث بالعنوان أو المؤلف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="الكل">الكل</option>
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingBook(null)
              setShowForm(true)
            }}
          >
            + إضافة كتاب
          </button>
        </div>

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        {loading ? (
          <p>...جاري التحميل</p>
        ) : filteredBooks.length === 0 ? (
          <p className="empty-state">لا توجد كتب مطابقة.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>المؤلف</th>
                  <th>التصنيف</th>
                  <th>الرفّ / الموقع</th>
                  <th>الحالة</th>
                  <th>سنة النشر</th>
                  <th>ملاحظات</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book.id}>
                    <td>{book.title}</td>
                    <td>{book.author || '—'}</td>
                    <td>{book.category || '—'}</td>
                    <td>{book.shelf_location || '—'}</td>
                    <td>
                      <span className={`status-badge status-${statusClass(book.reading_status)}`}>
                        {book.reading_status}
                      </span>
                    </td>
                    <td>{book.publication_year ?? '—'}</td>
                    <td className="notes-cell">{book.notes || '—'}</td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          setEditingBook(book)
                          setShowForm(true)
                        }}
                      >
                        تعديل
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(book)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <BookForm
          initialBook={editingBook}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingBook(null)
          }}
        />
      )}
    </div>
  )
}

function statusClass(status: string) {
  if (status === 'انتهى') return 'done'
  if (status === 'قيد القراءة') return 'reading'
  return 'unread'
}
