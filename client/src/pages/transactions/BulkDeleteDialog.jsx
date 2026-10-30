import { useState } from 'react';
import { bulkDeleteTransactions } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import styles from './DeleteTransactionDialog.module.css';

// "Are you sure?" before the ticked transactions are deleted. There is no Undo for this one, so it asks first.
// ids: the ids of the ticked rows. onDeleted(count) runs after the API said OK.
export default function BulkDeleteDialog({ ids, onDeleted, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const label = `${ids.length} ${ids.length === 1 ? 'transaction' : 'transactions'}`;

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
    <Modal title={`Delete ${label}?`} onClose={onClose} busy={deleting}>
      <p className={styles.text}>The selected {label} will be deleted for good. This can't be undone.</p>

      <div className={styles.actions}>
        {/* data-autofocus: keyboard users land on the safe choice (see Modal) */}
        <Button variant="secondary" onClick={onClose} disabled={deleting} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
