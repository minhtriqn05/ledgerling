import { useEffect } from 'react';
import Icon from '../Icon.jsx';
import IconButton from '../IconButton/IconButton.jsx';
import styles from './Toast.module.css';

const DURATION = 3000; // ms before a toast hides itself

// One small message. toast = { id, type: 'success' | 'error', message }.
// Errors use role="alert" (read out at once), success uses role="status" (read out politely).
// onDismiss(id) must keep the same identity between renders, or the 3-second timer would restart.
export default function Toast({ toast, onDismiss }) {
  const { id, type, message } = toast;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), DURATION);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className={styles.tile}>
        <Icon name={type === 'error' ? 'alert' : 'check'} size={18} />
      </span>
      <p className={styles.message}>{message}</p>
      <IconButton icon="x" size={16} label="Close message" onClick={() => onDismiss(id)} />
    </div>
  );
}
