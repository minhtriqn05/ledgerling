import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { loadSavedLanguage } from './i18n/index.js';
import './utils/installPrompt.js';
import { watchServiceWorkerUpdates } from './utils/swUpdate.js';
import { pauseDecorationsWhenIdle } from './utils/idleDecorations.js';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles/tokens.css';
import './styles/global.css';

// A "data router" around the whole app: useBlocker (ask before leaving a form with unsaved changes) only works in one.
// The routes themselves stay in App.jsx, below this one catch-all route.
// ErrorBoundary is inside the route, because a data router would otherwise catch the error with its own page.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    ),
  },
]);

// A new deploy shows after one reload, also in the installed app (utils/swUpdate.js)
watchServiceWorkerUpdates();

// A page that nobody touches stops its endless decorations, so it costs almost no processor time (utils/idleDecorations.js)
pauseDecorationsWhenIdle();

// The code of a page is downloaded the first time the page opens (App.jsx). When that download fails (no network yet,
// or a new deploy replaced the files of the open version), the error screen shows; the page is then loaded again by
// itself: at once when the network is there (once a minute at most, so a real error cannot loop), else when it comes back.
const RELOAD_KEY = 'ledgerling.reloadedForCode';
window.addEventListener('vite:preloadError', () => {
  if (!navigator.onLine) {
    window.addEventListener('online', () => window.location.reload(), { once: true });
    return;
  }
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < 60000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});

// A language other than English is downloaded first (see i18n/index.js), so the first screen is already in it
loadSavedLanguage().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {/* reducedMotion="user": motion components follow the prefers-reduced-motion setting of the system */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </StrictMode>
  );
});
