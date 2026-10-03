import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  const legacyReactEnv = {
    REACT_APP_NEXT_ENABLED: process.env.REACT_APP_NEXT_ENABLED || env.VITE_NEXT_ENABLED || 'false',
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
    plugins: [
      {
        name: 'legacy-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (/src\/.*\.js$/.test(id)) return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
        },
      },
      react(), tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // The current codebase contains JSX in both .js and .jsx files. Keep that
    // source layout intact for this migration; the later TypeScript/Next.js
    // pass can rename files incrementally without coupling it to the bundler swap.
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
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
