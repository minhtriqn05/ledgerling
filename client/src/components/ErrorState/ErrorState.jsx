import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import styles from './ErrorState.module.css';

// A failed load: the error alert and (when onRetry is given) a "Try again" button below it.
export default function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.error}>
      <Alert>{message}</Alert>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
