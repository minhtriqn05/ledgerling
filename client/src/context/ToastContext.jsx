import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ToastViewport from '../components/Toast/ToastViewport.jsx';

// Small messages in the corner of the screen ("Transaction added"). Any component can show one.

const ToastContext = createContext(null);

const MAX_TOASTS = 3; // the oldest one is dropped when more arrive
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((type, message) => {
    setToasts((list) => [...list, { id: ++nextId, type, message }].slice(-MAX_TOASTS));
  }, []);

  // Same object on every render, so components can put it in an effect's dependency list.
  const value = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// Usage: const toast = useToast(); toast.success('Category added'); toast.error(getErrorMessage(err));
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
