import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/generar-pdf': 'http://localhost:5000',
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'frontend/dist',
    emptyOutDir: true
  }
});
