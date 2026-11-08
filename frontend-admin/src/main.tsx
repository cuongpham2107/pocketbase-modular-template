import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import '@/lib/i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/admin">
    <App />
  </BrowserRouter>
)
