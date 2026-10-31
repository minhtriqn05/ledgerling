import { useTranslation } from 'react-i18next';
import { useLiveStatus } from '../../context/SocketContext.jsx';
import { useOnline } from '../../hooks/useOnline.js';
import styles from './LiveStatus.module.css';

// The small dot in the navigation: is this device receiving the changes of the other devices right now?
// Without a network the answer is no at once; a socket itself can take a while to notice that its connection is gone.
export default function LiveStatus() {
  const { t } = useTranslation();
  const socketStatus = useLiveStatus();
  const online = useOnline();
  const status = online ? socketStatus : 'reconnecting';

  return (
    <span className={`${styles.status} ${styles[status]}`} role="status" title={t(`live.${status}Hint`)} data-testid="live-status" data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {t(`live.${status}`)}
    </span>
  );
}
