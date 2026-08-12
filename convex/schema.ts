import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'
import { bookFields } from './constants'

// authTables تضيف جداول المصادقة (users, authAccounts, authSessions ...)
// التي يديرها @convex-dev/auth، ولا نكتب فيها مباشرة.
export default defineSchema({
  ...authTables,

  books: defineTable({
    ...bookFields,
    ownerId: v.id('users'),
  }).index('by_owner', ['ownerId']),
})
