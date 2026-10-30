import { useEffect, useState } from 'react';
import { deleteContribution, getGoal } from '../../api/goals.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, formatSignedVnd, formatVnd } from '../../utils/format.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import styles from './HistoryDialog.module.css';

// The money added to and taken out of one goal, newest first, with a delete button for an entry made by mistake.
// It loads the goal itself (the list on the page has no history). `goal` is the card's goal: only its id and name are used.
// onChanged(goal) receives the goal returned after a delete, so the page can show the new saved amount.
export default function HistoryDialog({ goal, onChanged, onClose }) {
  // The goal with its contributions, or null while loading
  const [full, setFull] = useState(null);
  const [loadError, setLoadError] = useState('');
  // "Try again" changes this, which runs the effect again
  const [reloadKey, setReloadKey] = useState(0);
  // The id of the entry that is being deleted
  const [deletingId, setDeletingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getGoal(goal._id)
      .then((data) => {
        if (!cancelled) setFull(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [goal._id, reloadKey]);

  function retry() {
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  async function handleDelete(entry) {
    setDeletingId(entry._id);
    try {
      const updated = await deleteContribution(goal._id, entry._id);
      toast.success('Entry deleted');
      setFull(updated);
      onChanged(updated);
    } catch (err) {
      // e.g. "Deleting this deposit would make the saved amount negative"
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  function renderBody() {
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;
    if (!full) return <LoadingState>Loading history…</LoadingState>;

    return (
      <>
        <p className={styles.summary}>
          {formatVnd(full.savedAmount)} saved of {formatVnd(full.targetAmount)}
        </p>

        {full.contributions.length === 0 ? (
          <p className={styles.empty}>No money added yet. Use Add money to start saving.</p>
        ) : (
          <ul className={styles.list}>
            {full.contributions.map((entry) => {
              const isDeposit = entry.amount > 0;
              const kind = isDeposit ? 'deposit' : 'withdrawal';
              const amountText = formatSignedVnd(Math.abs(entry.amount), isDeposit ? 'income' : 'expense');
              return (
                <li key={entry._id} className={styles.row}>
                  <div className={styles.main}>
                    <span className={styles.kind}>{isDeposit ? 'Deposit' : 'Withdrawal'}</span>
                    <span className={styles.meta}>
                      {formatDate(entry.date)}
                      {entry.note && ` · ${entry.note}`}
                    </span>
                  </div>
                  <span className={`${styles.amount} ${isDeposit ? styles.income : styles.expense}`}>{amountText}</span>
                  <IconButton
                    icon="trash"
                    size={16}
                    danger
                    label={`Delete ${kind} of ${formatVnd(Math.abs(entry.amount))}`}
                    disabled={deletingId !== null}
                    onClick={() => handleDelete(entry)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  return (
    <Modal title={`History · ${goal.name}`} onClose={onClose} busy={deletingId !== null}>
      <div className={styles.body}>
        {renderBody()}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={deletingId !== null} data-autofocus>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
