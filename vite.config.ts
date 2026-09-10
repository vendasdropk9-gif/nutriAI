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
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wav,mp3}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
