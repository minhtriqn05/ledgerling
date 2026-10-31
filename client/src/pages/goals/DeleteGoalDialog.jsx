import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteGoal } from '../../api/goals.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatVnd } from '../../utils/format.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
// Same layout as the "Delete this transaction?" dialog, so it uses the same styles
import styles from '../transactions/DeleteTransactionDialog.module.css';

// "Are you sure?" step before a goal is deleted. onDeleted(goal) runs after the API said OK.
export default function DeleteGoalDialog({ goal, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteGoal(goal._id);
      onDeleted(goal);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('goals.deleteQuestion')} onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>{goal.name}</strong>
        <span>
          {t('goals.savedOf', { saved: formatVnd(goal.savedAmount), target: formatVnd(goal.targetAmount) })}
        </span>
      </p>
      <p className={styles.text}>{t('goals.deleteText')}</p>

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
