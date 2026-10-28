import { useState } from 'react';
import { deleteTransaction } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { formatDateDMY, formatSignedVnd } from '../../utils/format.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import styles from './DeleteTransactionDialog.module.css';

// "Are you sure?" step before a transaction is deleted. onDeleted(transaction) runs after the API said OK.
export default function DeleteTransactionDialog({ transaction, onDeleted, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setError('');
    setDeleting(true);
    try {
      await deleteTransaction(transaction._id);
      onDeleted(transaction);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title="Delete this transaction?" onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>{transaction.note || transaction.category.name}</strong>
        <span>
          {transaction.category.name} · {formatDateDMY(transaction.date)} ·{' '}
          {formatSignedVnd(transaction.amount, transaction.type)}
        </span>
      </p>
      <p className={styles.text}>This can't be undone.</p>

      {error && <Alert>{error}</Alert>}

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
