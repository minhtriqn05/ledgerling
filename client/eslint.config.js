import js from '@eslint/js';

// npm run lint. The recommended rules of ESLint for the React app (src/), its tests, the Playwright tests (e2e/),
// the scripts and the config files. JSX is parsed by ESLint itself (ESLint 10 counts a component used in JSX as used).

const names = (list) => Object.fromEntries(list.map((name) => [name, 'readonly']));

// What the browser gives a page. Listed here because the "globals" package is not a dependency of the project.
const browserGlobals = names([
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'console', 'fetch',
  'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader', 'FormData', 'Image', 'ImageData', 'Event', 'CustomEvent',
  'KeyboardEvent', 'MouseEvent', 'HTMLElement', 'HTMLInputElement', 'HTMLDialogElement', 'Node', 'Storage', 'DOMParser',
  'DOMRect', 'DOMMatrix', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'queueMicrotask', 'structuredClone', 'matchMedia', 'performance', 'crypto', 'caches', 'AbortController',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'PerformanceObserver', 'OffscreenCanvas', 'createImageBitmap',
  'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'screen', 'scrollTo', 'innerWidth', 'innerHeight',
]);
// What Node.js gives the scripts, the config files and the Playwright tests
const nodeGlobals = names(['process', 'console', 'Buffer', 'URL', 'setTimeout', 'clearTimeout']);

export default [
  { ignores: ['dist/', 'dist-e2e/', 'coverage/', 'playwright-report/', 'test-results/', 'dev-dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    // A disable comment that is no longer needed is an error too
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: ['e2e/**', 'scripts/**', '*.config.js', 'pwa-assets.config.js'],
    languageOptions: { globals: { ...browserGlobals, ...nodeGlobals } },
  },
];
