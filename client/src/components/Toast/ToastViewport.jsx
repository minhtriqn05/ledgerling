import { useEffect, useRef } from 'react';
import Toast from './Toast.jsx';
import styles from './Toast.module.css';

// The stack of toasts in the top-right corner.
// It is a popover (manual), which the browser draws in the "top layer". Without that, a toast
// raised while a <dialog> is open (e.g. a server error in the transaction form) would hide behind the dialog.
export default function ToastViewport({ toasts, onDismiss }) {
  const ref = useRef(null);
  const previousCount = useRef(0);

  useEffect(() => {
    const element = ref.current;
    const added = toasts.length > previousCount.current;
    previousCount.current = toasts.length;

    const isOpen = element.matches(':popover-open');
    if (toasts.length === 0) {
      if (isOpen) element.hidePopover();
    } else if (!isOpen) {
      element.showPopover();
    } else if (added && document.querySelector('dialog[open]')) {
      // Hide and show again to move the stack above a dialog that opened after it.
      element.hidePopover();
      element.showPopover();
    }
  }, [toasts.length]);

  return (
    <div ref={ref} popover="manual" className={styles.viewport} aria-label="Messages">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
