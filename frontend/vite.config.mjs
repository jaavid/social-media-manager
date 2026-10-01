import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  const legacyReactEnv = {
    NODE_ENV: isProduction ? 'production' : 'development',
    REACT_APP_API_URL:
      process.env.REACT_APP_API_URL || env.VITE_API_URL || env.REACT_APP_API_URL,
    REACT_APP_WS_URL:
      process.env.REACT_APP_WS_URL || env.VITE_WS_URL || env.REACT_APP_WS_URL,
    REACT_APP_PLAUSIBLE_DOMAIN:
      process.env.REACT_APP_PLAUSIBLE_DOMAIN ||
      env.VITE_PLAUSIBLE_DOMAIN ||
      env.REACT_APP_PLAUSIBLE_DOMAIN,
    REACT_APP_PLAUSIBLE_HOST:
      process.env.REACT_APP_PLAUSIBLE_HOST ||
      env.VITE_PLAUSIBLE_HOST ||
      env.REACT_APP_PLAUSIBLE_HOST,
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'process.env': JSON.stringify(legacyReactEnv),
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:8000',
          ws: true,
        },
        '/media': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: 'static/js/[name].[hash].js',
          chunkFileNames: 'static/js/[name].[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            if (name.endsWith('.css')) return 'static/css/[name].[hash][extname]';
            return 'static/media/[name].[hash][extname]';
          },
        },
      },
    },
  };
});
