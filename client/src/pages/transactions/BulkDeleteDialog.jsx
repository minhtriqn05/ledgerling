import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bulkDeleteTransactions } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import styles from './DeleteTransactionDialog.module.css';

// "Are you sure?" before the ticked transactions are deleted. There is no Undo for this one, so it asks first.
// ids: the ids of the ticked rows. onDeleted(count) runs after the API said OK.
export default function BulkDeleteDialog({ ids, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      const { deleted } = await bulkDeleteTransactions(ids);
      onDeleted(deleted);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('transactions.bulkDeleteQuestion', { count: ids.length })} onClose={onClose} busy={deleting}>
      <p className={styles.text}>{t('transactions.bulkDeleteText', { count: ids.length })}</p>

      <div className={styles.actions}>
        {/* data-autofocus: keyboard users land on the safe choice (see Modal) */}
        <Button variant="secondary" onClick={onClose} disabled={deleting} data-autofocus>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? t('common.deleting') : t('common.delete')}
        </Button>
      </div>
    </Modal>
  );
}
