import { useTranslation } from 'react-i18next';
import Icon from '../Icon.jsx';
import { useOnline } from '../../hooks/useOnline.js';
import styles from './OfflineBanner.module.css';

// Shown on top of every signed-in page while there is no network: the data on screen may be old,
// and the buttons that write to the API are locked (see useOfflineLock).
export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnline();

  if (online) return null;

  return (
    <div className={styles.banner} role="status">
      <Icon name="alert" size={18} />
      <p className={styles.text}>
        <strong>{t('offline.banner')}</strong>
        <span>{t('offline.note')}</span>
      </p>
    </div>
  );
}
