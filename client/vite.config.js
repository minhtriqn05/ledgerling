import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // New deploys are downloaded in the background and activated automatically
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ledgerling',
        short_name: 'Ledgerling',
        description: 'Personal expense tracker',
        theme_color: '#2874b5',
        background_color: '#f4f7fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Only the built app files are precached. There is no runtimeCaching,
      // so API requests always go to the network.
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
});
