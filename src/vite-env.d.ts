/// <reference types="vite/client" />

// متغيّرات البيئة التي تقرؤها الواجهة. `convex deploy` في سير النشر يضبط
// VITE_CONVEX_URL بنفسه على رابط نشر الإنتاج، ولا يُكتب يدويًّا إلا محليًّا.
interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
