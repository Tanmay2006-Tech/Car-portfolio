import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Archivo with both axes (weight and width): the display face runs at its
// widest, the way car badging and liveries are set. Instrument Sans for body.
import '@fontsource-variable/archivo/standard.css'
import '@fontsource-variable/instrument-sans/wght.css'
import './index.css'
import './layout.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
