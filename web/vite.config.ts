import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built site also works when opened from any static folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: '127.0.0.1' },
})
