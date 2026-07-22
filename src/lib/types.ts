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
  notes: string | null
  created_at: string
  updated_at: string
}

export type BookInput = Omit<Book, 'id' | 'user_id' | 'created_at' | 'updated_at'>
