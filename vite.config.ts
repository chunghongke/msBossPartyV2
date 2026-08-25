import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/database'],
          'vendor-radix': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
