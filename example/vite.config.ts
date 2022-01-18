import { defineConfig } from 'vite'
import ruby from 'vite-plugin-ruby'
import manifestSri from 'vite-plugin-manifest-sri'

export default defineConfig({
  build: {
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [
    ruby(),
    manifestSri(),
  ],
})
