import Icon from '../Icon.jsx';
import { useOfflineLock } from '../../hooks/useOnline.js';
import styles from './IconButton.module.css';

// Round button that shows only an icon. `label` is read by screen readers, because there is no visible text.
// `danger` turns it red on hover (for delete). `needsNetwork`: locked while offline, like Button.
// Any other prop (onClick...) goes straight to the <button>.
export default function IconButton({ icon, label, size = 18, danger = false, needsNetwork = false, disabled, title, ...rest }) {
  const { locked, note } = useOfflineLock(needsNetwork);
  return (
    <button
      type="button"
      className={`${styles.button} ${danger ? styles.danger : ''}`}
      aria-label={label}
      disabled={disabled || locked}
      title={note ?? title}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
