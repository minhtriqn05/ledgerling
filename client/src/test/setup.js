// Runs before every unit test file.
// jest-dom adds matchers like toBeInTheDocument(); cleanup() removes what the last test rendered.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '../i18n/index.js';

// Unit tests run with prefers-reduced-motion: no enter or exit animations to wait for.
// (jsdom has no matchMedia of its own.)
window.matchMedia = (query) => ({
  matches: query.includes('reduce'),
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
});

afterEach(() => {
  cleanup();
});

// jsdom hides every [popover] but has no showPopover() to open one. The panels of Select and DatePicker are
// only rendered while open, so here they are simply shown.
const popoverStyle = document.createElement('style');
popoverStyle.textContent = '[popover] { display: block !important; }';
document.head.appendChild(popoverStyle);
