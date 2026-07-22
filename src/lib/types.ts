export type ReadingStatus = 'لم يُقرأ' | 'قيد القراءة' | 'انتهى'

export const READING_STATUSES: ReadingStatus[] = ['لم يُقرأ', 'قيد القراءة', 'انتهى']

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  category: string | null
  shelf_location: string | null
  reading_status: ReadingStatus
  publication_year: number | null
  cover_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type BookInput = Omit<Book, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface Visit {
  id: string
  user_id: string
  visitor_name: string
  visit_date: string
  purpose: string | null
  notes: string | null
  created_at: string
}

export type VisitInput = Omit<Visit, 'id' | 'user_id' | 'created_at'>

export type BorrowStatus = 'مستعار' | 'تم الإرجاع'

export const BORROW_STATUSES: BorrowStatus[] = ['مستعار', 'تم الإرجاع']

export interface Borrow {
  id: string
  user_id: string
  book_id: string | null
  book_title_snapshot: string
  borrower_name: string
  borrow_date: string
  due_date: string | null
  return_date: string | null
  status: BorrowStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type BorrowInput = Omit<Borrow, 'id' | 'user_id' | 'created_at' | 'updated_at'>
