import { useTranslation } from 'react-i18next';
import { formatDate, formatSignedVnd } from '../../utils/format.js';
import Drawer from '../../components/Drawer/Drawer.jsx';
import Button from '../../components/Button/Button.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './TransactionDrawer.module.css';

// The details of one transaction, opened by a click on its row. onEdit and onDelete do what the row buttons do.
export default function TransactionDrawer({ transaction, onEdit, onDelete, onClose }) {
  const { t } = useTranslation();
  const { category, type, amount, note, date, tags = [], recurringRuleId } = transaction;

  return (
    <Drawer title={t('transactions.details')} onClose={onClose}>
      <div className={`${styles.hero} ${styles[type]}`}>
        <CategoryMark category={category} size="lg" />
        <strong className={styles.amount}>{formatSignedVnd(amount, type)}</strong>
        <span className={styles.heroNote}>{note || category.name}</span>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>{t('common.category')}</dt>
          <dd>{category.name}</dd>
        </div>
        <div>
          <dt>{t('common.type')}</dt>
          <dd>{t(`common.${type}`)}</dd>
        </div>
        <div>
          <dt>{t('common.date')}</dt>
          <dd>{formatDate(date)}</dd>
        </div>
        <div>
          <dt>{t('common.note')}</dt>
          <dd>{note || '—'}</dd>
        </div>
        <div>
          <dt>{t('common.tags')}</dt>
          <dd>{tags.length > 0 ? tags.map((tag) => `#${tag}`).join(' ') : '—'}</dd>
        </div>
        {recurringRuleId && (
          <div>
            <dt>{t('transactions.recurringLabel')}</dt>
            <dd className={styles.recurring}>
              <Icon name="repeat" size={14} />
              {t('transactions.fromRule')}
            </dd>
          </div>
        )}
      </dl>

      <div className={styles.actions}>
        <Button needsNetwork variant="secondary" icon="edit" block onClick={() => onEdit(transaction)} data-autofocus>
          {t('common.edit')}
        </Button>
        <Button needsNetwork variant="danger" icon="trash" block onClick={() => onDelete(transaction)}>
          {t('common.delete')}
        </Button>
      </div>
    </Drawer>
  );
}
