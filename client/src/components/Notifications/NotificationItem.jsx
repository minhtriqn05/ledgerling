import { useTranslation } from 'react-i18next';
import Icon from '../Icon.jsx';
import IconButton from '../IconButton/IconButton.jsx';
import { formatAge, notificationText, styleOf } from '../../utils/notifications.js';
import styles from './NotificationItem.module.css';

// One row of the bell dropdown and of the Notifications page: an icon tile in the color of its type, the title,
// the message, how long ago it came, and a dot while it is unread.
// onOpen(notification) is called when the row is clicked; onDelete (optional) adds a delete button next to it.
export default function NotificationItem({ notification, onOpen, onDelete }) {
  const { t } = useTranslation();
  const { icon, tone } = styleOf(notification.type);
  const { title, message } = notificationText(notification, t);

  return (
    <li className={`${styles.item} ${notification.read ? '' : styles.unread}`}>
      <button type="button" className={styles.main} onClick={() => onOpen(notification)}>
        <span className={styles.tile} style={{ '--tone': `var(--accent-${tone})` }}>
          <Icon name={icon} size={18} />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.message}>{message}</span>
          <time className={styles.time} dateTime={notification.createdAt}>
            {formatAge(notification.createdAt, t)}
          </time>
        </span>
        {!notification.read && (
          <>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.srOnly}>{t('notifications.unread')}</span>
          </>
        )}
      </button>
      {onDelete && (
        <IconButton needsNetwork
          icon="trash"
          danger
          label={t('notifications.delete', { title })}
          onClick={() => onDelete(notification)}
        />
      )}
    </li>
  );
}
