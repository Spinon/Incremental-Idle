import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setAutoFreeze } from 'immer'
import './index.css'
import App from './App'

// Immer deep-freezes every new state by default; on the map store (thousands
// of grid/fog entries) that freeze walk dominates each set() and made the
// offline simulation crawl on large saves.
setAutoFreeze(false)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
