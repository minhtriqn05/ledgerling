import styles from './Button.module.css';

// Pill button in the primary color. `block` makes it fill the width of its container.
// Any other prop (type, disabled, onClick...) goes straight to the <button>.
export default function Button({ block = false, className = '', children, ...rest }) {
  const classes = [styles.button, block ? styles.block : '', className].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
