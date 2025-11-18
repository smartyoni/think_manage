import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/think_manage/',
      root: '.',
      server: {
        port: 3000,
        host: '0.0.0.0',
        middlewareMode: false,
      },
      plugins: [
        react(),
        VitePWA({
          strategies: 'generateSW',
          manifest: {
            name: '생각관리',
            short_name: '생각관리',
            description: '할일과 고민을 체계적으로 관리하는 앱',
            theme_color: '#4f46e5',
            background_color: '#ffffff',
            display: 'standalone',
            scope: '/think_manage/',
            start_url: '/think_manage/',
            orientation: 'portrait-primary',
            icons: [
              {
                src: '/think_manage/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/think_manage/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/think_manage/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
              },
              {
                src: '/think_manage/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
            categories: ['productivity'],
            screenshots: [
              {
                src: '/think_manage/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tailwind-cdn',
                  expiration: {
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                  },
                },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
