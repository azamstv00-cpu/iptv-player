import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode !== 'development' ? [basicSsl()] : [])],
  server: {
    https: mode !== 'development',
    host: true,
    port: mode === 'development' ? 3000 : 5173,
  },
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
    chunkSizeWarningLimit: 300,
  },
}))
