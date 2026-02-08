import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@volleyvision/data-model': path.resolve(__dirname, '../data-model/src'),
      '@volleyvision/dvw-parser': path.resolve(__dirname, '../dvw-parser/src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
