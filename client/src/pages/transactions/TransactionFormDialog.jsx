import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { createTransaction, updateTransaction } from '../../api/transactions.js';
import { createTemplate } from '../../api/templates.js';
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
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './TransactionFormDialog.module.css';
import DatePicker from '../../components/DatePicker/DatePicker.jsx';

// "Add transaction" dialog, or "Edit transaction" when `transaction` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// categories: all the user's categories. onSaved(transaction) receives the transaction returned by the API.
// onDelete (edit only) adds a Delete button; the page then shows the delete confirmation.
export default function TransactionFormDialog({ transaction, categories, onSaved, onClose, onDelete }) {
  const { t } = useTranslation();
  const typeOptions = [
    { value: 'expense', label: t('common.expense'), tone: 'expense' },
    { value: 'income', label: t('common.income'), tone: 'income' },
  ];
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
  // "Save as template": also keeps category + amount + note as a template for the Quick add chips
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
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
    if (!Number(amount)) return setError(t('form.enterAmount'));
    if (!categoryId) return setError(t('form.chooseCategory'));
    if (!date) return setError(t('form.pickDate'));

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
      // The transaction is saved by now. A template that fails must not look like the transaction failed.
      if (saveTemplate) {
        try {
          const name = templateName.trim() || data.note || saved.category.name;
          await createTemplate({ name: name.slice(0, 40), categoryId, amount: data.amount, note: data.note });
          toast.success(t('transactions.templateSaved'));
        } catch (err) {
          toast.error(t('transactions.templateFailed', { reason: getErrorMessage(err) }));
        }
      }
      // The page closes the dialog and reloads the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? t('transactions.edit') : t('transactions.add')} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <SegmentedControl block label={t('common.type')} options={typeOptions} value={type} onChange={changeType} disabled={saving} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transaction-amount">
            {t('common.amount')}
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

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="transaction-date">
              {t('common.date')}
            </label>
            <DatePicker
              id="transaction-date"
              value={date}
              onChange={setDate}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="transaction-note">
              {t('common.note')}
            </label>
            <input
              id="transaction-note"
              className={styles.input}
              autoComplete="off"
              placeholder={t('common.optional')}
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transaction-tags">
            {t('common.tags')}
          </label>
          <TagInput id="transaction-tags" value={tags} onChange={setTags} suggestions={knownTags} disabled={saving} />
        </div>

        <div className={styles.field}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={saveTemplate}
              disabled={saving}
              onChange={(event) => setSaveTemplate(event.target.checked)}
            />
            {t('transactions.saveAsTemplate')}
          </label>
          {saveTemplate && (
            <>
              <label className={styles.srOnly} htmlFor="template-name">
                {t('transactions.templateName')}
              </label>
              <input
                id="template-name"
                className={styles.input}
                autoComplete="off"
                placeholder={t('transactions.templatePlaceholder')}
                maxLength={40}
                value={templateName}
                disabled={saving}
                onChange={(event) => setTemplateName(event.target.value)}
              />
              <p className={styles.hint}>{t('transactions.templateHint')}</p>
            </>
          )}
        </div>

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          {isEdit && (
            <Button needsNetwork variant="danger" className={styles.deleteButton} onClick={() => onDelete(transaction)} disabled={saving}>
              {t('common.delete')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button needsNetwork type="submit" disabled={saving}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('transactions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
