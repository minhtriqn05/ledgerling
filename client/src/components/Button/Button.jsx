import Icon from '../Icon.jsx';
import styles from './Button.module.css';

// Pill button. `variant` picks the colors: 'primary' (default), 'secondary' (white, e.g. Cancel) or 'danger' (Delete).
// `icon` adds an icon on the left, `block` makes the button fill the width of its container.
// Any other prop (type, disabled, onClick...) goes straight to the <button>.
export default function Button({ variant = 'primary', icon, block = false, className = '', children, ...rest }) {
  const classes = [styles.button, styles[variant], icon ? styles.withIcon : '', block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
