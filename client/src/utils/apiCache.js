// The service worker keeps the answers of GET /api/* here, for offline use (runtimeCaching in vite.config.js).
export const API_CACHE = 'ledgerling-api';

// These answers belong to one account, so they are deleted on logout and when another account signs in.
// Older browsers and plain http pages have no Cache API; then there is nothing to delete.
export async function clearApiCache() {
  try {
    if ('caches' in window) await window.caches.delete(API_CACHE);
  } catch {
    // Storage blocked by the browser: nothing was stored either
  }
}
