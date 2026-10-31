import { useTranslation } from 'react-i18next';
import Icon from '../../components/Icon.jsx';
import styles from './Pager.module.css';

// "47 transactions" on the left, "Previous · Page 2 of 5 · Next" on the right.
// meta is { page, limit, total, totalPages } from the API; onPage(number) is called with the page to load.
export default function Pager({ meta, onPage }) {
  const { t } = useTranslation();
  const { page, total, totalPages } = meta;

  return (
    <div className={styles.pager}>
      <span className={styles.total}>
        {t('transactions.count', { count: total })}
      </span>
      <nav className={styles.pages} aria-label={t('pager.label')}>
        <button type="button" className={styles.pageButton} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevronLeft" size={16} />
          {t('pager.previous')}
        </button>
        <span className={styles.current} aria-live="polite">
          {t('pager.page', { page, total: Math.max(totalPages, 1) })}
        </span>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {t('pager.next')}
          <Icon name="chevronRight" size={16} />
        </button>
      </nav>
    </div>
  );
}
