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
    // npm run test:coverage: which lines of src/ the tests run (report in coverage/, not committed)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // npm run test:coverage fails below these (the CI runs it): the helpers and the hooks hold the logic
      thresholds: {
        lines: 60,
        'src/utils/**': { lines: 80 },
        'src/hooks/**': { lines: 80 },
      },
    },
  },
});
