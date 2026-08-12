import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import App from './App'
import { convex } from './lib/convexClient'
import { LibraryProvider } from './lib/library'
import './styles.css'

// ConvexAuthProvider يضبط هويّة الجلسة على العميل نفسه الذي تستعمله api.ts،
// فتمرّ نداءاتها مصادَقةً وإن لم تُكتب داخل مكوِّن React.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </ConvexAuthProvider>
  </React.StrictMode>,
)
