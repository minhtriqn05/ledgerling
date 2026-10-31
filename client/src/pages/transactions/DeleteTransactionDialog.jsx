import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteTransaction } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDateDMY, formatSignedVnd } from '../../utils/format.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import styles from './DeleteTransactionDialog.module.css';

// "Are you sure?" step before a transaction is deleted. onDeleted(transaction) runs after the API said OK.
export default function DeleteTransactionDialog({ transaction, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTransaction(transaction._id);
      onDeleted(transaction);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('transactions.deleteQuestion')} onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>{transaction.note || transaction.category.name}</strong>
        <span>
          {transaction.category.name} · {formatDateDMY(transaction.date)} ·{' '}
          {formatSignedVnd(transaction.amount, transaction.type)}
        </span>
      </p>
      <p className={styles.text}>{t('common.cannotUndo')}</p>

      <div className={styles.actions}>
        {/* data-autofocus: keyboard users land on the safe choice (see Modal) */}
        <Button variant="secondary" onClick={onClose} disabled={deleting} data-autofocus>
          {t('common.cancel')}
        </Button>
        <Button needsNetwork variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? t('common.deleting') : t('common.delete')}
        </Button>
      </div>
    </Modal>
  );
}
