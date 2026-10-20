import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// in development the react app runs on :5173 and the express api on :3000
// the proxy forwards every /api call to express, so the browser only ever talks to one origin
// (in production nginx does the same job, see deploy/nginx.conf)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API_URL lets you point at another port, e.g. API_URL=http://localhost:3001 npm run dev
      '/api': process.env.API_URL || 'http://localhost:3000',
    },
  },
})
