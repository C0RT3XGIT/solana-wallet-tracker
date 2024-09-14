import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fix: Move the `server` object inside the main config object
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 5173        // Optional, you can specify a different port
  }
})
