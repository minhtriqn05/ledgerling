import { useId, useState } from 'react';
import Icon from '../Icon.jsx';
import styles from './TextField.module.css';

// A labelled text input with an optional icon on the left.
// type="password" also gets a button on the right that shows or hides the password.
// Any other prop (value, onChange, autoComplete, maxLength...) goes straight to the <input>.
export default function TextField({ label, icon, type = 'text', ...rest }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        {icon && <Icon name={icon} size={18} />}
        <input
          id={id}
          className={`${styles.input} ${isPassword ? styles.inputWithAction : ''}`}
          type={isPassword && visible ? 'text' : type}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            aria-label="Show password"
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <Icon name="eye" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
