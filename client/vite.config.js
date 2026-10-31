import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { API_CACHE } from './src/utils/apiCache.js';

// index.html holds its address-dependent tags (Open Graph, Twitter card, canonical link) with __SITE_URL__ in them,
// because those tags need the full address of the site. This plugin writes the real address in at build time.
// Set VITE_SITE_URL (Vercel > Settings > Environment Variables) to the real link; the default below is a stand-in.
function siteUrl(address) {
  return {
    name: 'ledgerling-site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', address),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const address = (env.VITE_SITE_URL || 'https://ledgerling.vercel.app').replace(/\/+$/, '');

  return {
    plugins: [
      siteUrl(address),
      react(),
      VitePWA({
        // New deploys are downloaded in the background and activated automatically
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Ledgerling',
          short_name: 'Ledgerling',
          description: 'Personal expense tracker',
          theme_color: '#2874b5',
          background_color: '#f4f7fa',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          // Long-press the installed app's icon. AppLayout opens Quick add for this address.
          shortcuts: [
            {
              name: 'Add transaction',
              short_name: 'Add',
              description: 'Open Quick add',
              url: '/?quickAdd=1',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        // The built app files are precached. Reads from the API try the network first; with no answer within
        // 5 seconds (offline, or the free server is still waking up) the saved copy is used.
        // The copies are deleted on logout and when another account signs in (utils/apiCache.js).
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Not the health check (it must tell the truth) and not the exports (files, and they should be fresh)
              urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !/\/(health|export)$/.test(url.pathname),
              method: 'GET',
              handler: 'NetworkFirst',
              options: {
                cacheName: API_CACHE,
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
  };
});
