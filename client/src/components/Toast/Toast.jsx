import { useEffect } from 'react';
import Icon from '../Icon.jsx';
import IconButton from '../IconButton/IconButton.jsx';
import styles from './Toast.module.css';

export const DEFAULT_DURATION = 3000; // ms before a toast hides itself

// One small message. toast = { id, type: 'success' | 'error', message, duration?, action? }.
// action = { label, onClick }: a button next to the message ("Undo"). Clicking it runs onClick and closes the toast.
// Errors use role="alert" (read out at once), success uses role="status" (read out politely).
// onDismiss(id) must keep the same identity between renders, or the timer would restart.
export default function Toast({ toast, onDismiss }) {
  const { id, type, message, duration = DEFAULT_DURATION, action } = toast;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  function handleAction() {
    action.onClick();
    onDismiss(id);
  }

  return (
    <div className={`${styles.toast} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className={styles.tile}>
        <Icon name={type === 'error' ? 'alert' : 'check'} size={18} />
      </span>
      <p className={styles.message}>{message}</p>
      {action && (
        <button type="button" className={styles.action} onClick={handleAction}>
          {action.label}
        </button>
      )}
      <IconButton icon="x" size={16} label="Close message" onClick={() => onDismiss(id)} />
    </div>
  );
}
