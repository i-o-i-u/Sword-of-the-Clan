import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Book, BookInput, READING_STATUSES } from '../lib/types'
import BookForm from '../components/BookForm'
import BookCover from '../components/BookCover'

const AUTO_OPEN_KEY = 'sotc-auto-open-add-book'

export default function BooksBrowse() {
  const { session, requireAuth } = useAuth()
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

  useEffect(() => {
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) {
      sessionStorage.removeItem(AUTO_OPEN_KEY)
      setEditingBook(null)
      setShowForm(true)
    }
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

  async function openAddForm() {
    const ok = await requireAuth()
    if (ok) {
      setEditingBook(null)
      setShowForm(true)
    }
  }

  async function openEditForm(book: Book) {
    const ok = await requireAuth()
    if (ok) {
      setEditingBook(book)
      setShowForm(true)
    }
  }

  async function handleSave(input: BookInput) {
    if (editingBook) {
      const { error } = await supabase.from('books').update(input).eq('id', editingBook.id)
      if (error) {
        setErrorMsg('تعذّر تعديل الكتاب: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('books').insert({ ...input, user_id: session!.user.id })
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
    const ok = await requireAuth()
    if (!ok) return
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
        !q || b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'الكل' || b.category === categoryFilter
      const matchesStatus = statusFilter === 'الكل' || b.reading_status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [books, search, categoryFilter, statusFilter])

  return (
    <div className="section-page">
      <div className="section-header">
        <h1>📚 تصفّح الكتب</h1>
        <button className="btn btn-primary" onClick={openAddForm}>
          + إضافة كتاب
        </button>
      </div>

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
      </div>

      {errorMsg && <p className="error-text">{errorMsg}</p>}

      {loading ? (
        <p>...جاري التحميل</p>
      ) : filteredBooks.length === 0 ? (
        <p className="empty-state">لا توجد كتب مطابقة.</p>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <article key={book.id} className="book-card">
              <BookCover title={book.title} coverUrl={book.cover_url} />
              <div className="book-card-body">
                <h3 className="book-card-title">{book.title}</h3>
                <p className="book-card-author">{book.author || 'مؤلف غير معروف'}</p>
                <div className="book-card-meta">
                  {book.category && <span className="tag">{book.category}</span>}
                  <span className={`status-badge status-${statusClass(book.reading_status)}`}>
                    {book.reading_status}
                  </span>
                </div>
                <dl className="book-card-details">
                  {book.shelf_location && (
                    <div>
                      <dt>الموقع</dt>
                      <dd>{book.shelf_location}</dd>
                    </div>
                  )}
                  {book.publication_year && (
                    <div>
                      <dt>سنة النشر</dt>
                      <dd>{book.publication_year}</dd>
                    </div>
                  )}
                </dl>
                {book.notes && <p className="book-card-notes">{book.notes}</p>}
              </div>
              <div className="book-card-actions">
                <button className="btn btn-small" onClick={() => openEditForm(book)}>
                  تعديل
                </button>
                <button className="btn btn-small btn-danger" onClick={() => handleDelete(book)}>
                  حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

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
