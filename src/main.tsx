import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/jost/wght.css'
import '@fontsource-variable/archivo/wght.css'
import './index.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
