import { useTranslation } from 'react-i18next';
import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import styles from './ErrorState.module.css';

// A failed load: the error alert and (when onRetry is given) a "Try again" button below it.
export default function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();

  return (
    <div className={styles.error}>
      <Alert>{message}</Alert>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  );
}
