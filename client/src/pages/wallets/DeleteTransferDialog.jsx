import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteTransfer } from '../../api/wallets.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatVnd } from '../../utils/format.js';
import Button from '../../components/Button/Button.jsx';
import Modal from '../../components/Modal/Modal.jsx';
// Same layout as the "Delete this transaction?" dialog, so it uses the same styles
import styles from '../../components/Modal/ConfirmDelete.module.css';

// "Are you sure?" step before a transfer is deleted: the money goes back. onDeleted(transfer) runs after the API said OK.
export default function DeleteTransferDialog({ transfer, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTransfer(transfer._id);
      onDeleted(transfer);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('wallets.transfer.deleteQuestion')} onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>
          {transfer.from.name} → {transfer.to.name}
        </strong>
        <span>{formatVnd(transfer.amount)}</span>
      </p>
      <p className={styles.text}>{t('wallets.transfer.deleteText', { from: transfer.from.name })}</p>

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
