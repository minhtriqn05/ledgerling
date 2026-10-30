import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTransaction, updateTransaction } from '../../api/transactions.js';
import { getTags } from '../../api/tags.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber } from '../../utils/format.js';
import { fromDateInput, toDateInput, todayInput } from '../../utils/vnDate.js';
import Modal from '../../components/Modal/Modal.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import TagInput from '../../components/TagInput/TagInput.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './TransactionFormDialog.module.css';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', tone: 'expense' },
  { value: 'income', label: 'Income', tone: 'income' },
];

// "Add transaction" dialog, or "Edit transaction" when `transaction` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// categories: all the user's categories. onSaved(transaction) receives the transaction returned by the API.
// onDelete (edit only) adds a Delete button; the page then shows the delete confirmation.
export default function TransactionFormDialog({ transaction, categories, onSaved, onClose, onDelete }) {
  const isEdit = Boolean(transaction);
  const initialDate = transaction ? toDateInput(transaction.date) : todayInput();

  const [type, setType] = useState(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : ''); // digits only
  const [categoryId, setCategoryId] = useState(transaction?.category._id ?? '');
  const [date, setDate] = useState(initialDate);
  const [note, setNote] = useState(transaction?.note ?? '');
  const [tags, setTags] = useState(transaction?.tags ?? []);
  // The tags used before, offered as suggestions. If they cannot be loaded the box simply has none.
  const [knownTags, setKnownTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    getTags()
      .then((data) => {
        if (!cancelled) setKnownTags(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const typeCategories = categories.filter((c) => c.type === type);

  // The categories shown depend on the type, so changing the type clears the chosen category.
  function changeType(nextType) {
    setType(nextType);
    setCategoryId('');
  }

  // VND has no decimals: keep only the digits (the box shows them with dots: 185.000).
  function changeAmount(event) {
    setAmount(event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!Number(amount)) return setError('Please enter an amount greater than 0.');
    if (!categoryId) return setError('Please choose a category.');
    if (!date) return setError('Please pick a date.');

    const data = { categoryId, amount: Number(amount), note: note.trim(), tags };

    setError('');
    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        // Send the date only if it changed, so an untouched date keeps its original time.
        if (date !== initialDate) data.date = fromDateInput(date);
        saved = await updateTransaction(transaction._id, data);
      } else {
        saved = await createTransaction({ ...data, date: fromDateInput(date) });
      }
      // The page closes the dialog and reloads the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit transaction' : 'Add transaction'} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <SegmentedControl block label="Type" options={TYPE_OPTIONS} value={type} onChange={changeType} disabled={saving} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transaction-amount">
            Amount
          </label>
          <div className={styles.amountBox}>
            <input
              id="transaction-amount"
              className={`${styles.amountInput} ${styles[type]}`}
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

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>Category</legend>
          {typeCategories.length === 0 ? (
            <p className={styles.hint}>
              No {type} categories yet. <Link to="/categories">Create one</Link> first.
            </p>
          ) : (
            <div className={styles.categoryPicker}>
              {typeCategories.map((c) => {
                const selected = c._id === categoryId;
                return (
                  <button
                    key={c._id}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                    style={{ '--tone': c.color }}
                    aria-pressed={selected}
                    onClick={() => setCategoryId(c._id)}
                  >
                    {selected ? <Icon name="check" size={14} /> : <i className={styles.dot} />}
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="transaction-date">
              Date
            </label>
            <input
              id="transaction-date"
              className={styles.input}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="transaction-note">
              Note
            </label>
            <input
              id="transaction-note"
              className={styles.input}
              autoComplete="off"
              placeholder="Optional"
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transaction-tags">
            Tags
          </label>
          <TagInput id="transaction-tags" value={tags} onChange={setTags} suggestions={knownTags} disabled={saving} />
        </div>

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          {isEdit && (
            <Button variant="danger" className={styles.deleteButton} onClick={() => onDelete(transaction)} disabled={saving}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
