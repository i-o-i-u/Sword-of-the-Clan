import type { Doc } from '../../convex/_generated/dataModel'

export { READING_STATUSES } from '../../convex/constants'

/** صفّ كتاب كما يعود من Convex (بحقلي النظام _id و _creationTime). */
export type Book = Doc<'books'>

/** الحقول التي يرسلها نموذج الإضافة/التعديل. */
export type BookInput = Omit<Book, '_id' | '_creationTime' | 'ownerId'>

export type ReadingStatus = Book['readingStatus']
