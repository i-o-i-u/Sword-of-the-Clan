import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'إعدادات Supabase مفقودة. يرجى ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY كمتغيرات بيئة.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
