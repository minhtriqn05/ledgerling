import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Run `npm run generate-pwa-assets` after changing public/favicon.svg. It writes the PNG icons next to it.
// Maskable and Apple icons get the brand color behind them, because those platforms cut their own shape.
const BRAND_BACKGROUND = '#21799d';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { background: BRAND_BACKGROUND, fit: 'contain' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: BRAND_BACKGROUND, fit: 'contain' },
    },
  },
  images: ['public/favicon.svg'],
});
