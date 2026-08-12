import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Book, BookInput, READING_STATUSES } from '../lib/types'
import { errorText } from '../lib/errors'
import BookForm from '../components/BookForm'

export default function Home() {
  const { signOut } = useAuthActions()

  // استعلامات Convex تفاعليّة: أي إضافة أو تعديل تنعكس هنا تلقائيًّا
  // دون إعادة تحميل يدويّة.
  const books = useQuery(api.books.list)
  const viewer = useQuery(api.users.viewer)

  const addBook = useMutation(api.books.add)
  const updateBook = useMutation(api.books.update)
  const removeBook = useMutation(api.books.remove)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('الكل')
  const [statusFilter, setStatusFilter] = useState('الكل')

  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  const loading = books === undefined

  async function handleSave(input: BookInput) {
    setErrorMsg(null)
    try {
      if (editingBook) {
        await updateBook({ id: editingBook._id, ...input })
      } else {
        await addBook(input)
      }
    } catch (error) {
      setErrorMsg(
        errorText(error, editingBook ? 'تعذّر تعديل الكتاب.' : 'تعذّر إضافة الكتاب.')
      )
      return
    }
    setShowForm(false)
    setEditingBook(null)
  }

  async function handleDelete(book: Book) {
    if (!confirm(`هل تريد حذف كتاب "${book.title}"؟`)) return
    setErrorMsg(null)
    try {
      await removeBook({ id: book._id })
    } catch (error) {
      setErrorMsg(errorText(error, 'تعذّر حذف الكتاب.'))
    }
  }

  const categories = useMemo(() => {
    const set = new Set((books ?? []).map((b) => b.category).filter(Boolean) as string[])
    return ['الكل', ...Array.from(set).sort()]
  }, [books])

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (books ?? []).filter((b) => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'الكل' || b.category === categoryFilter
      const matchesStatus = statusFilter === 'الكل' || b.readingStatus === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [books, search, categoryFilter, statusFilter])

  return (
    <div className="page">
      <header className="app-header">
        <h1>📚 مكتبة سيف العشيرة</h1>
        <div className="header-actions">
          <span className="user-email">{viewer?.email}</span>
          <button className="btn" onClick={() => void signOut()}>
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
                  <tr key={book._id}>
                    <td>{book.title}</td>
                    <td>{book.author || '—'}</td>
                    <td>{book.category || '—'}</td>
                    <td>{book.shelfLocation || '—'}</td>
                    <td>
                      <span className={`status-badge status-${statusClass(book.readingStatus)}`}>
                        {book.readingStatus}
                      </span>
                    </td>
                    <td>{book.publicationYear ?? '—'}</td>
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
