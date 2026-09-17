import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { h4RadarBridge } from './vite-h4-plugin.ts'

export default defineConfig({
  plugins: [react(), h4RadarBridge()],
  server: {
    port: 5173,
    host: true,
    open: true,
  },
})
