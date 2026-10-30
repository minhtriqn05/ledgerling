import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit tests only. The PWA plugin from vite.config.js is not needed here.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Only files next to the code in src/. Playwright tests live in e2e/ and are run by `npm run test:e2e`.
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
