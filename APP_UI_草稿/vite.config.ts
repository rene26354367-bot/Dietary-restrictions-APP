import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'favicon.ico'],
        manifest: {
          name: '飲食營養追蹤',
          short_name: '營養APP',
          description: '個人飲食紀錄、OCR 掃描營養標示、體態追蹤一體化工具',
          theme_color: '#3b82f6',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'zh-TW',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              // HTML / JS / CSS：優先網路，失敗才用快取
              // 讓用戶刷新頁面就自動獲得最新版本，無需卸載重裝
              urlPattern: /\.(html|js|css)$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'app-shell',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 24 * 60 * 60 // 1 天過期
                }
              }
            },
            {
              // API 請求：不快取（NetworkOnly）
              // 原因：per-uid 資料不應被 Service Worker cache，
              // 否則不同設備/清快取後可能拿到舊資料
              urlPattern: /\/api\//,
              handler: 'NetworkOnly'
            },
            {
              // 靜態資源（圖片、字體）：使用快取優先，網路失敗時用舊版
              urlPattern: /\.(png|jpg|jpeg|svg|woff2|woff)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 天過期
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(pkg.version),
      '__BUILD_DATE__': JSON.stringify(new Date().toISOString().split('T')[0]),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
