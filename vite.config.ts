import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// اسم المستودع على GitHub Pages يُستخدم كمسار أساس عند البناء للنشر.
//
// وهذا أساسُ Pages وحده. أمّا استضافةُ فايربيس فتُقيم الموقع في جذر نطاقها،
// فأساسُها `/` — ويُبنى لها بناءً ثانيًا يُمرَّر فيه `--base` من سطر الأمر
// (`npm run build:root`)، فيغلب ما هنا. والملفّان يخرجان إلى مجلَّدين
// منفصلين، فلكل استضافةٍ حزمتُها بأساسها.
const repoName = 'Sword-of-the-Clan'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? `/${repoName}/` : '/',
}))
