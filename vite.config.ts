import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// اسم المستودع على GitHub Pages يُستخدم كمسار أساس عند البناء للنشر
const repoName = 'Sword-of-the-Clan'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? `/${repoName}/` : '/',
}))
