import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset URLs: the build runs unchanged from a domain root
  // (Vercel) or any sub-path.
  base: './',
  plugins: [react()],
})
