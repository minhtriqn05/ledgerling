import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteRecurringRule } from '../../api/recurring.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatSignedVnd } from '../../utils/format.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
// Same layout as the "Delete this transaction?" dialog, so it uses the same styles
import styles from '../transactions/DeleteTransactionDialog.module.css';

// "Are you sure?" step before a rule is deleted. onDeleted(rule) runs after the API said OK.
export default function DeleteRuleDialog({ rule, onDeleted, onClose }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteRecurringRule(rule._id);
      onDeleted(rule);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal title={t('recurring.deleteQuestion')} onClose={onClose} busy={deleting}>
      <p className={styles.summary}>
        <strong>{rule.note || rule.category.name}</strong>
        <span>
          {rule.category.name} · {formatSignedVnd(rule.amount, rule.category.type)}
        </span>
      </p>
      <p className={styles.text}>{t('recurring.deleteText')}</p>

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
