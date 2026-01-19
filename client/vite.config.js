import { defineConfig } from 'vite'

// Minimal Vite config for client-only mode
export default defineConfig({
  server: {
    // no proxy necessary in client-only mode
  }
})
