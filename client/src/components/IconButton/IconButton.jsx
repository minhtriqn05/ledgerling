import Icon from '../Icon.jsx';
import styles from './IconButton.module.css';

// Round button that shows only an icon. `label` is read by screen readers, because there is no visible text.
// `danger` turns it red on hover (for delete). Any other prop (onClick, disabled...) goes straight to the <button>.
export default function IconButton({ icon, label, size = 18, danger = false, ...rest }) {
  return (
    <button
      type="button"
      className={`${styles.button} ${danger ? styles.danger : ''}`}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
