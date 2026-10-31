import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        },
        // Only the built app files are precached. There is no runtimeCaching,
        // so API requests always go to the network.
        workbox: {
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ],
  };
});
