import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import Toast from './Toast.jsx';
import styles from './Toast.module.css';

// The stack of toasts in the top-right corner.
// It is a popover (manual), which the browser draws in the "top layer". Without that, a toast
// raised while a <dialog> is open (e.g. a server error in the transaction form) would hide behind the dialog.
export default function ToastViewport({ toasts, onDismiss }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const previousCount = useRef(0);

  useEffect(() => {
    const element = ref.current;
    const added = toasts.length > previousCount.current;
    previousCount.current = toasts.length;

    const isOpen = element.matches(':popover-open');
    if (toasts.length === 0) {
      // With animations the stack is hidden after the last toast has faded out (onExitComplete below)
      if (isOpen && reduced) element.hidePopover();
    } else if (!isOpen) {
      element.showPopover();
    } else if (added && document.querySelector('dialog[open]')) {
      // Hide and show again to move the stack above a dialog that opened after it.
      element.hidePopover();
      element.showPopover();
    }
  }, [toasts.length, reduced]);

  function hideWhenEmpty() {
    const element = ref.current;
    if (previousCount.current === 0 && element?.matches(':popover-open')) element.hidePopover();
  }

  return (
    <div ref={ref} popover="manual" className={styles.viewport} aria-label={t('common.messages')}>
      {reduced ? (
        toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />)
      ) : (
        <AnimatePresence initial={false} onExitComplete={hideWhenEmpty}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Toast toast={toast} onDismiss={onDismiss} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
