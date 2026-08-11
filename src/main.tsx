import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LibraryProvider } from './lib/library'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </React.StrictMode>,
)
