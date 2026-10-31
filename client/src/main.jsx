import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './i18n/index.js';
import './utils/installPrompt.js';
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
