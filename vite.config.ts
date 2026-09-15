import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'suppress-vite-logs',
        enforce: 'pre',
        transformIndexHtml(html) {
          return html.replace(
            '<head>',
            `<head>
    <script>
      (function() {
        try {
          if (typeof window !== 'undefined' && window.WebSocket) {
            var OrigWS = window.WebSocket;
            function FakeViteWS(url, protocols) {
              var self = this;
              self.url = url;
              self.protocols = protocols;
              self.readyState = 0;
              self.CONNECTING = 0;
              self.OPEN = 1;
              self.CLOSING = 2;
              self.CLOSED = 3;
              self._listeners = {};
              self.addEventListener = function(type, fn) {
                if (!self._listeners[type]) self._listeners[type] = [];
                self._listeners[type].push(fn);
              };
              self.removeEventListener = function(type, fn) {
                if (!self._listeners[type]) return;
                self._listeners[type] = self._listeners[type].filter(function(f) { return f !== fn; });
              };
              self.dispatchEvent = function(evt) {
                var list = self._listeners[evt.type] || [];
                for (var i = 0; i < list.length; i++) {
                  try { list[i].call(self, evt); } catch(e) {}
                }
              };
              self.send = function() {};
              self.close = function() {
                self.readyState = 3;
                var evt = { type: 'close', wasClean: true, code: 1000, reason: '' };
                self.dispatchEvent(evt);
                if (typeof self.onclose === 'function') self.onclose(evt);
              };
              setTimeout(function() {
                self.readyState = 1;
                var evt = { type: 'open' };
                self.dispatchEvent(evt);
                if (typeof self.onopen === 'function') self.onopen(evt);
              }, 1);
            }
            FakeViteWS.CONNECTING = 0;
            FakeViteWS.OPEN = 1;
            FakeViteWS.CLOSING = 2;
            FakeViteWS.CLOSED = 3;

            window.WebSocket = function(url, protocols) {
              var isVite = false;
              if (protocols === 'vite-hmr' || protocols === 'vite-ping') isVite = true;
              else if (Array.isArray(protocols) && (protocols.indexOf('vite-hmr') !== -1 || protocols.indexOf('vite-ping') !== -1)) isVite = true;
              else if (typeof url === 'string' && (url.indexOf('token=') !== -1 || url.indexOf('vite') !== -1 || url.indexOf('24678') !== -1)) isVite = true;
              if (isVite) return new FakeViteWS(url, protocols);
              return new OrigWS(url, protocols);
            };
            window.WebSocket.prototype = OrigWS.prototype;
            window.WebSocket.CONNECTING = 0;
            window.WebSocket.OPEN = 1;
            window.WebSocket.CLOSING = 2;
            window.WebSocket.CLOSED = 3;
          }
        } catch(e) {}

        var isViteNotice = function(args) {
          if (!args) return false;
          for (var i = 0; i < args.length; i++) {
            var a = args[i];
            if (!a) continue;
            if (typeof a === 'string' && (a.indexOf('[vite]') !== -1 || a.indexOf('vite:') !== -1 || a.indexOf('@vite') !== -1)) return true;
            if (typeof a.message === 'string' && (a.message.indexOf('[vite]') !== -1 || a.message.indexOf('vite:') !== -1 || a.message.indexOf('@vite') !== -1)) return true;
            if (typeof a.stack === 'string' && (a.stack.indexOf('@vite/client') !== -1 || a.stack.indexOf('[vite]') !== -1)) return true;
          }
          return false;
        };

        ['error', 'warn', 'log', 'info', 'debug'].forEach(function(method) {
          if (typeof console !== 'undefined' && console[method]) {
            var orig = console[method];
            console[method] = function() {
              if (isViteNotice(arguments)) return;
              orig.apply(console, arguments);
            };
          }
        });

        window.addEventListener('error', function(event) {
          if (event && (
            (typeof event.message === 'string' && (event.message.indexOf('[vite]') !== -1 || event.message.indexOf('@vite') !== -1)) ||
            (event.filename && event.filename.indexOf('@vite/client') !== -1)
          )) {
            event.stopImmediatePropagation();
            event.preventDefault();
          }
        }, true);

        window.addEventListener('unhandledrejection', function(event) {
          if (event && event.reason && (
            (typeof event.reason === 'string' && (event.reason.indexOf('[vite]') !== -1 || event.reason.indexOf('@vite') !== -1)) ||
            (typeof event.reason.message === 'string' && (event.reason.message.indexOf('[vite]') !== -1 || event.reason.message.indexOf('@vite') !== -1 || event.reason.message.indexOf('WebSocket') !== -1)) ||
            (event.reason.stack && (event.reason.stack.indexOf('@vite/client') !== -1 || event.reason.stack.indexOf('[vite]') !== -1))
          )) {
            event.stopImmediatePropagation();
            event.preventDefault();
          }
        }, true);
      })();
    </script>`
          );
        }
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'NutriAI - Nutrição & Inteligência',
          short_name: 'NutriAI',
          description: 'Seu assistente inteligente de nutrição, saúde, treinos e longevidade com a Malu.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\/.*/, /^\/manual/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          importScripts: ['/sw-push-scheduler.js'],
          runtimeCaching: [
            // 1. Receitas & Imagens de Culinária (Unsplash CDN e outros bancos de imagens de pratos) - CacheFirst para carregamento offline instantâneo
            {
              urlPattern: /^https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|cdn\.pixabay\.com|firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|res\.cloudinary\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'recipe-food-images-cache',
                expiration: {
                  maxEntries: 350,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 dias de persistência para fotos de receitas
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 2. Imagens Locais e Assets de Mídia (Avatares, Pratos, Ícones de Categoria)
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|avif|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-media-assets-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Dados do Perfil e Endpoints da API NutriAI (/api/...) - NetworkFirst com fallback rápido para o cache
            {
              urlPattern: /\/api\/(?!health).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'nutriai-profile-api-cache',
                networkTimeoutSeconds: 3, // Se demorar mais de 3s ou estiver offline, serve dados do perfil em cache
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 4. Dados do Perfil e Registros no Supabase (REST API - profiles, intake_logs, habits)
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-profile-data-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 14, // 14 dias
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 5. Dados do Perfil e Firestore/Google APIs (Fallback para Firestore REST)
            {
              urlPattern: /^https:\/\/(?:firestore|identitytoolkit)\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firestore-profile-data-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 6. Fontes do Google (CSS das fontes)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 7. Arquivos de Fontes Web (Woff2 gstatic)
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      minify: false,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // 1. Bibliotecas de animação (motion / framer-motion)
            if (/[\\/]node_modules[\\/](motion|framer-motion)[\\/]/.test(id)) {
              return 'vendor-motion';
            }

            // 2. Biblioteca de ícones (lucide-react)
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
              return 'vendor-lucide';
            }

            // 3. Renderização 3D e canvas (three / @react-three)
            if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) {
              return 'vendor-three';
            }

            // 4. Gráficos analíticos (recharts / d3)
            if (/[\\/]node_modules[\\/](recharts|d3-[a-z0-9-]+|victory-vendor)[\\/]/.test(id)) {
              return 'vendor-charts';
            }

            // 5. Mapas e geolocalização (leaflet / react-leaflet)
            if (/[\\/]node_modules[\\/](leaflet|react-leaflet)[\\/]/.test(id)) {
              return 'vendor-maps';
            }

            // 6. Firebase e autenticação/banco
            if (/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/.test(id)) {
              return 'vendor-firebase';
            }

            // 7. Supabase client
            if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) {
              return 'vendor-supabase';
            }

            // 8. Utilitários de exportação (jspdf, html-to-image)
            if (/[\\/]node_modules[\\/](jspdf|html-to-image|pdf-parse-new)[\\/]/.test(id)) {
              return 'vendor-pdf';
            }

            // 9. React Core e runtime
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
