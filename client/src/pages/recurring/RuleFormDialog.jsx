import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
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
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
// Same fields as the "Add transaction" dialog, so it uses the same styles
import styles from '../transactions/TransactionFormDialog.module.css';
import DatePicker from '../../components/DatePicker/DatePicker.jsx';

// "Add rule" dialog, or "Edit rule" when `rule` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// categories: all the user's categories. onSaved(rule) receives the rule returned by the API.
export default function RuleFormDialog({ rule, categories, onSaved, onClose }) {
  const { t } = useTranslation();
  const typeOptions = [
    { value: 'expense', label: t('common.expense'), tone: 'expense' },
    { value: 'income', label: t('common.income'), tone: 'income' },
  ];
  const frequencyOptions = [
    { value: 'monthly', label: t('recurring.monthly') },
    { value: 'weekly', label: t('recurring.weekly') },
  ];
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
    if (!Number(amount)) return setError(t('form.enterAmount'));
    if (!categoryId) return setError(t('form.chooseCategory'));
    if (!startDate) return setError(t('recurring.pickStart'));
    // Same format, so comparing the strings compares the days
    if (endDate && endDate <= startDate) return setError(t('recurring.endAfterStart'));

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
    <Modal title={isEdit ? t('recurring.edit') : t('recurring.add')} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <SegmentedControl block label={t('common.type')} options={typeOptions} value={type} onChange={changeType} disabled={saving} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rule-amount">
            {t('common.amount')}
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
          <legend className={styles.label}>{t('common.category')}</legend>
          {typeCategories.length === 0 ? (
            <p className={styles.hint}>
              <Trans i18nKey={`form.noCategories.${type}`} components={{ link: <Link to="/categories" /> }} />
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
                    {selected ? (
                      <Icon name="check" size={14} />
                    ) : (
                      <CategoryMark category={c} />
                    )}
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>{t('recurring.frequency')}</legend>
          <SegmentedControl
            block
            label={t('recurring.frequency')}
            options={frequencyOptions}
            value={frequency}
            onChange={setFrequency}
            disabled={saving}
          />
        </fieldset>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rule-start">
              {t('recurring.startDate')}
            </label>
            <DatePicker
              id="rule-start"
              value={startDate}
              onChange={setStartDate}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rule-end">
              {t('recurring.endDate')}
            </label>
            <DatePicker
              id="rule-end"
              clearable
              value={endDate}
              onChange={setEndDate}
            />
          </div>
        </div>

        {runsOnLastDay && <p className={styles.hint}>{t('recurring.lastDayHint')}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rule-note">
            {t('common.note')}
          </label>
          <input
            id="rule-note"
            className={styles.input}
            autoComplete="off"
            placeholder={t('common.optional')}
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {isEdit && <p className={styles.hint}>{t('recurring.editHint')}</p>}

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('recurring.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
