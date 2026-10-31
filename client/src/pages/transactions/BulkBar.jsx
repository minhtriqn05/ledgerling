import { useTranslation } from 'react-i18next';
import Button from '../../components/Button/Button.jsx';
import styles from './BulkBar.module.css';

// The bar above the list while at least one row is ticked: how many, and what can be done with them.
// It is a role="region" so a screen reader finds it; the count is announced politely when it changes.
export default function BulkBar({ count, onChangeCategory, onDelete, onClear }) {
  const { t } = useTranslation();

  return (
    <div className={styles.bar} role="region" aria-label={t('transactions.bulkActions')}>
      <span className={styles.count} role="status">
        {t('transactions.selected', { count })}
      </span>
      <div className={styles.actions}>
        <Button variant="secondary" icon="categories" onClick={onChangeCategory}>
          {t('transactions.changeCategory')}
        </Button>
        <Button variant="danger" icon="trash" onClick={onDelete}>
          {t('transactions.deleteSelected')}
        </Button>
        <Button variant="secondary" onClick={onClear}>
          {t('transactions.clearSelection')}
        </Button>
      </div>
    </div>
  );
}
