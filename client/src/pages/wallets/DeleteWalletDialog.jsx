import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteWallet } from '../../api/wallets.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatVnd } from '../../utils/format.js';
import Button from '../../components/Button/Button.jsx';
import Modal from '../../components/Modal/Modal.jsx';
// Same layout as the "Delete this transaction?" dialog, so it uses the same styles
import styles from '../../components/Modal/ConfirmDelete.module.css';

// "Are you sure?" step before a wallet is deleted. onDeleted(wallet) runs after the API said OK.
// A wallet with a history is refused by the API (409): the toast says to archive it instead.
export default function DeleteWalletDialog({ wallet, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteWallet(wallet._id);
      onDeleted(wallet);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('wallets.deleteQuestion')} onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>{wallet.name}</strong>
        <span>{formatVnd(wallet.balance)}</span>
      </p>
      <p className={styles.text}>{t('wallets.deleteText')}</p>

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
