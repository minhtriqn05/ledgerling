import Icon from '../Icon.jsx';
import styles from './Alert.module.css';

// Error message box. role="alert" makes screen readers read it out as soon as it appears.
export default function Alert({ children }) {
  return (
    <div className={styles.alert} role="alert">
      <Icon name="alert" size={18} />
      <span>{children}</span>
    </div>
  );
}
