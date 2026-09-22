import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const buildTime = Date.now();

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(
            {
              buildTime,
              builtAt: new Date(buildTime).toISOString(),
            },
            null,
            2
          ),
        });
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/version.json' || req.url.startsWith('/version.json?'))) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(
              JSON.stringify(
                {
                  buildTime,
                  builtAt: new Date(buildTime).toISOString(),
                },
                null,
                2
              )
            );
            return;
          }
          next();
        });
      },
    },
  ],
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
