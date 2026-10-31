import Icon from '../Icon.jsx';
import { useOfflineLock } from '../../hooks/useOnline.js';
import styles from './Button.module.css';

// Pill button. `variant` picks the colors: 'primary' (default), 'secondary' (white, e.g. Cancel) or 'danger' (Delete).
// `icon` adds an icon on the left, `block` makes the button fill the width of its container.
// `needsNetwork` is for a button that writes to the API: it is locked while offline, with a note as its tooltip.
// Any other prop (type, onClick...) goes straight to the <button>.
export default function Button({ variant = 'primary', icon, block = false, needsNetwork = false, disabled, title, className = '', children, ...rest }) {
  const { locked, note } = useOfflineLock(needsNetwork);
  const classes = [styles.button, styles[variant], icon ? styles.withIcon : '', block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} disabled={disabled || locked} title={note ?? title} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
