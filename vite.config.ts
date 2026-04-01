import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import path from 'node:path'

export default defineConfig({
  root: './src/client',
  publicDir: '../public',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    target: 'esnext',
    outDir: '../../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, 'src/client/index.html'),
    },
  },
  plugins: [solidPlugin()],
})
