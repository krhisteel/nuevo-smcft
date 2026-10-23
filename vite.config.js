import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    // En desarrollo la API corre en un proceso aparte (npm run dev:api)
    proxy: {
      '/api': `http://localhost:${process.env.API_PORT || 3001}`,
    },
  },
})
