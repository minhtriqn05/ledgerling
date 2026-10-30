import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createRecurringRule, updateRecurringRule } from '../../api/recurring.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber } from '../../utils/format.js';
import { toDateInput, todayInput } from '../../utils/vnDate.js';
import Modal from '../../components/Modal/Modal.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Icon from '../../components/Icon.jsx';
// Same fields as the "Add transaction" dialog, so it uses the same styles
import styles from '../transactions/TransactionFormDialog.module.css';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', tone: 'expense' },
  { value: 'income', label: 'Income', tone: 'income' },
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];

// "Add rule" dialog, or "Edit rule" when `rule` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// categories: all the user's categories. onSaved(rule) receives the rule returned by the API.
export default function RuleFormDialog({ rule, categories, onSaved, onClose }) {
  const isEdit = Boolean(rule);

  const [type, setType] = useState(rule?.category.type ?? 'expense');
  const [amount, setAmount] = useState(rule ? String(rule.amount) : ''); // digits only
  const [categoryId, setCategoryId] = useState(rule?.category._id ?? '');
  const [frequency, setFrequency] = useState(rule?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(rule ? toDateInput(rule.startDate) : todayInput());
  const [endDate, setEndDate] = useState(rule?.endDate ? toDateInput(rule.endDate) : '');
  const [note, setNote] = useState(rule?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const typeCategories = categories.filter((c) => c.type === type);
  // The last two characters of "2026-10-31" are the day
  const runsOnLastDay = frequency === 'monthly' && Number(startDate.slice(8)) > 28;

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
    if (!startDate) return setError('Please pick a start date.');
    // Same format, so comparing the strings compares the days
    if (endDate && endDate <= startDate) return setError('The end date must be after the start date.');

    const data = { categoryId, amount: Number(amount), note: note.trim(), frequency, startDate, endDate: endDate || null };

    setError('');
    setSaving(true);
    try {
      const saved = isEdit ? await updateRecurringRule(rule._id, data) : await createRecurringRule(data);
      // The page closes the dialog and reloads the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit rule' : 'Add rule'} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <SegmentedControl block label="Type" options={TYPE_OPTIONS} value={type} onChange={changeType} disabled={saving} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rule-amount">
            Amount
          </label>
          <div className={styles.amountBox}>
            <input
              id="rule-amount"
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

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>Frequency</legend>
          <SegmentedControl
            block
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={setFrequency}
            disabled={saving}
          />
        </fieldset>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rule-start">
              Start date
            </label>
            <input
              id="rule-start"
              className={styles.input}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rule-end">
              End date (optional)
            </label>
            <input
              id="rule-end"
              className={styles.input}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        {runsOnLastDay && <p className={styles.hint}>In shorter months this rule runs on the last day of the month.</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rule-note">
            Note
          </label>
          <input
            id="rule-note"
            className={styles.input}
            autoComplete="off"
            placeholder="Optional"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {isEdit && <p className={styles.hint}>Transactions already created stay as they are.</p>}

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
