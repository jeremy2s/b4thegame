import { defineConfig } from 'vite'

// Minimal Vite config for client-only mode
export default defineConfig(() => ({
  base: process.env.GITHUB_ACTIONS ? '/b4thegame/' : '/',
  server: {
    // no proxy necessary in client-only mode
  }
}))
