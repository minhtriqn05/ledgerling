import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addContribution } from '../../api/goals.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber, formatVnd } from '../../utils/format.js';
import { todayInput } from '../../utils/vnDate.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
// Same fields as the "Add transaction" dialog, so it uses the same styles
import styles from '../transactions/TransactionFormDialog.module.css';

// "Add money" (mode 'add') or "Withdraw money" (mode 'withdraw') dialog for one goal.
// The server gets a positive amount for a deposit and a negative one for a withdrawal.
// onSaved(goal) receives the goal returned by the API, with its new saved amount.
export default function MoneyDialog({ goal, mode, onSaved, onClose }) {
  const { t } = useTranslation();
  const isWithdraw = mode === 'withdraw';

  const [amount, setAmount] = useState(''); // digits only
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // VND has no decimals: keep only the digits (the box shows them with dots: 500.000).
  function changeAmount(event) {
    setAmount(event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    const value = Number(amount);
    if (!value) return setError(t('form.enterAmount'));
    if (isWithdraw && value > goal.savedAmount) {
      return setError(t('goals.withdrawMax', { amount: formatVnd(goal.savedAmount) }));
    }
    if (!date) return setError(t('form.pickDate'));

    setError('');
    setSaving(true);
    try {
      const saved = await addContribution(goal._id, { amount: isWithdraw ? -value : value, note: note.trim(), date });
      // The page closes the dialog and updates the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isWithdraw ? t('goals.withdrawMoney') : t('goals.addMoney')} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.hint}>
          <strong>{goal.name}</strong> · {t('goals.savedOf', { saved: formatVnd(goal.savedAmount), target: formatVnd(goal.targetAmount) })}
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="money-amount">
            {t('common.amount')}
          </label>
          <div className={styles.amountBox}>
            <input
              id="money-amount"
              className={`${styles.amountInput} ${isWithdraw ? styles.expense : styles.income}`}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              data-autofocus
              value={amount ? formatNumber(Number(amount)) : ''}
              onChange={changeAmount}
            />
            <span>₫</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="money-date">
            {t('common.date')}
          </label>
          <input
            id="money-date"
            className={styles.input}
            type="date"
            max={todayInput()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="money-note">
            {t('common.note')}
          </label>
          <input
            id="money-note"
            className={styles.input}
            autoComplete="off"
            placeholder={t('common.optional')}
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : isWithdraw ? t('goals.withdrawFrom') : t('goals.addTo')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
