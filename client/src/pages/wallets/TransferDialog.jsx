import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTransfer } from '../../api/wallets.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber, formatVnd } from '../../utils/format.js';
import { fromDateInput, todayInput } from '../../utils/vnDate.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import DatePicker from '../../components/DatePicker/DatePicker.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import Select from '../../components/Select/Select.jsx';
import fields from '../transactions/TransactionFormDialog.module.css';

// "Transfer money": moves money from one wallet to another. wallets: the wallets that take money (at least two).
// The page mounts it only while it is open. onSaved(transfer) receives the transfer returned by the API.
export default function TransferDialog({ wallets, onSaved, onClose }) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState(wallets[0]?._id ?? '');
  const [toId, setToId] = useState(wallets[1]?._id ?? '');
  const [amount, setAmount] = useState(''); // digits only
  const [date, setDate] = useState(todayInput());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // The number and the balance in the name, so the choice shows how much is there
  const options = wallets.map((wallet) => ({ value: wallet._id, label: wallet.name, hint: formatVnd(wallet.balance) }));

  // VND has no decimals: keep only the digits (the box shows them with dots: 185.000).
  function changeAmount(event) {
    setAmount(event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (fromId === toId) return setError(t('wallets.transfer.chooseTwo'));
    if (!Number(amount)) return setError(t('form.enterAmount'));
    if (!date) return setError(t('form.pickDate'));

    setError('');
    setSaving(true);
    try {
      const saved = await createTransfer({
        fromWalletId: fromId,
        toWalletId: toId,
        amount: Number(amount),
        date: fromDateInput(date),
        note: note.trim(),
      });
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={t('wallets.transfer.title')} onClose={onClose} busy={saving}>
      <form className={fields.form} onSubmit={handleSubmit} noValidate>
        <div className={fields.row}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="transfer-from">
              {t('wallets.transfer.from')}
            </label>
            <Select id="transfer-from" value={fromId} options={options} onChange={setFromId} disabled={saving} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="transfer-to">
              {t('wallets.transfer.to')}
            </label>
            <Select id="transfer-to" value={toId} options={options} onChange={setToId} disabled={saving} />
          </div>
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor="transfer-amount">
            {t('common.amount')}
          </label>
          <div className={fields.amountBox}>
            <input
              id="transfer-amount"
              className={fields.amountInput}
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

        <div className={fields.row}>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="transfer-date">
              {t('common.date')}
            </label>
            <DatePicker id="transfer-date" value={date} onChange={setDate} disabled={saving} />
          </div>
          <div className={fields.field}>
            <label className={fields.label} htmlFor="transfer-note">
              {t('common.note')}
            </label>
            <input
              id="transfer-note"
              className={fields.input}
              autoComplete="off"
              placeholder={t('common.optional')}
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <p className={fields.hint}>{t('wallets.transfer.notCounted')}</p>

        {error && <Alert>{error}</Alert>}

        <div className={fields.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button needsNetwork type="submit" icon="transfer" disabled={saving}>
            {saving ? t('common.saving') : t('wallets.transfer.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
