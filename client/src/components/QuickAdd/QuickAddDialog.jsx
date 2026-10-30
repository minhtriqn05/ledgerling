import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories } from '../../api/categories.js';
import { getTags } from '../../api/tags.js';
import { deleteTemplate, getTemplates } from '../../api/templates.js';
import { createTransaction } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { formatNumber, formatVnd } from '../../utils/format.js';
import { parseQuickAdd } from '../../utils/quickAdd.js';
import { fromDateInput, todayInput } from '../../utils/vnDate.js';
import Modal from '../Modal/Modal.jsx';
import Button from '../Button/Button.jsx';
import Alert from '../Alert/Alert.jsx';
import TagInput from '../TagInput/TagInput.jsx';
import CategoryMark from '../CategoryMark/CategoryMark.jsx';
import Icon from '../Icon.jsx';
import form from '../../pages/transactions/TransactionFormDialog.module.css';
import styles from './QuickAddDialog.module.css';

// "Quick add" (the + button or the N key): a short form to add a transaction in a few seconds.
//   1. Template chips: one click saves a transaction dated today.
//   2. One line like "coffee 35k #work" or "salary 15tr yesterday": the app reads the amount, the day, the tags and
//      guesses the category (utils/quickAdd.js). What it understood is shown in the fields below, so it is the preview.
//   3. The fields (amount, category chips, date, note, tags), which can be changed before saving.
// onSaved() runs after a transaction is created; the app then reloads the page that is open. onClose closes the dialog.
export default function QuickAddDialog({ onSaved, onClose }) {
  const toast = useToast();
  // The categories and the templates; a failing template list must not stop the user from adding a transaction.
  const { data, loading, error, reload } = useLoad(
    () => Promise.all([getCategories(), getTemplates().catch(() => [])]),
    []
  );
  const categories = useMemo(() => data?.[0] ?? [], [data]);
  const [removedTemplates, setRemovedTemplates] = useState([]); // ids deleted in this dialog
  const templates = (data?.[1] ?? []).filter((t) => !removedTemplates.includes(t._id));

  // Tags used before, for the suggestions. If they cannot be loaded the box simply has none.
  const { data: knownTags } = useLoad(() => getTags().catch(() => []), []);

  const [smart, setSmart] = useState('');
  // What the user typed into a field by hand. A field in here is no longer filled from the text line.
  const [manual, setManual] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseQuickAdd(smart, { categories }), [smart, categories]);

  // Each field: the user's own value if there is one, else what the line says, else the default.
  const amount = manual.amount ?? (parsed.amount ? String(parsed.amount) : '');
  const categoryId = manual.categoryId ?? parsed.categoryId ?? '';
  const date = manual.date ?? parsed.date ?? todayInput();
  const note = manual.note ?? parsed.note;
  const tags = manual.tags ?? parsed.tags;

  const selectedCategory = categories.find((c) => c._id === categoryId);
  const tone = selectedCategory?.type ?? 'expense'; // the amount takes the color of the type

  function setField(field, value) {
    setManual((current) => ({ ...current, [field]: value }));
  }

  function changeSmart(event) {
    const value = event.target.value;
    setSmart(value);
    // Emptying the line starts again: the fields go back to their defaults
    if (!value.trim()) setManual({});
  }

  // VND has no decimals: keep only the digits (the box shows them with dots: 185.000).
  function changeAmount(event) {
    setField('amount', event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!Number(amount)) return setFormError('Please enter an amount greater than 0.');
    if (!categoryId) return setFormError('Please choose a category.');
    if (!date) return setFormError('Please pick a date.');

    setFormError('');
    setSaving(true);
    try {
      await createTransaction({
        categoryId,
        amount: Number(amount),
        note: note.trim(),
        tags,
        date: fromDateInput(date),
      });
      toast.success('Transaction added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  // One click on a template: save it as a transaction dated today
  async function useTemplate(template) {
    setSaving(true);
    try {
      await createTransaction({
        categoryId: template.category._id,
        amount: template.amount,
        note: template.note,
        date: fromDateInput(todayInput()),
      });
      toast.success(`Added "${template.name}"`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  async function removeTemplate(template) {
    try {
      await deleteTemplate(template._id);
      setRemovedTemplates((ids) => [...ids, template._id]);
      toast.success(`Template "${template.name}" deleted`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function renderCategories() {
    if (loading) return <p className={form.hint}>Loading categories…</p>;
    if (error) {
      return (
        <p className={form.hint}>
          {error}{' '}
          <button type="button" className={styles.linkButton} onClick={reload}>
            Try again
          </button>
        </p>
      );
    }
    if (categories.length === 0) {
      return (
        <p className={form.hint}>
          No categories yet. <Link to="/categories">Create one</Link> first.
        </p>
      );
    }

    return ['expense', 'income'].map((type) => {
      const group = categories.filter((c) => c.type === type);
      if (group.length === 0) return null;
      return (
        <div key={type} className={styles.group}>
          <span className={styles.groupLabel}>{type === 'expense' ? 'Expense' : 'Income'}</span>
          <div className={form.categoryPicker}>
            {group.map((c) => {
              const selected = c._id === categoryId;
              return (
                <button
                  key={c._id}
                  type="button"
                  className={`${form.chip} ${selected ? form.chipSelected : ''}`}
                  style={{ '--tone': c.color }}
                  aria-pressed={selected}
                  disabled={saving}
                  onClick={() => setField('categoryId', c._id)}
                >
                  {selected ? (
                    <Icon name="check" size={14} />
                  ) : (
                    <CategoryMark icon={c.icon}>
                      <i className={form.dot} />
                    </CategoryMark>
                  )}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      );
    });
  }

  return (
    <Modal title="Quick add" onClose={onClose} busy={saving}>
      <form className={form.form} onSubmit={handleSubmit} noValidate>
        {templates.length > 0 && (
          <section className={styles.templates} aria-label="Templates">
            <span className={form.label}>Templates · one click saves</span>
            <ul className={styles.templateList}>
              {templates.map((template) => (
                <li key={template._id} className={styles.template} style={{ '--tone': template.category.color }}>
                  <button
                    type="button"
                    className={styles.templateUse}
                    disabled={saving}
                    onClick={() => useTemplate(template)}
                  >
                    <CategoryMark icon={template.category.icon}>
                      <i className={form.dot} />
                    </CategoryMark>
                    <span className={styles.templateName}>{template.name}</span>
                    <span className={styles.templateAmount}>{formatVnd(template.amount)}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.templateRemove}
                    aria-label={`Delete template ${template.name}`}
                    disabled={saving}
                    onClick={() => removeTemplate(template)}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={form.field}>
          <label className={form.label} htmlFor="quick-text">
            Quick text
          </label>
          <input
            id="quick-text"
            className={form.input}
            autoComplete="off"
            placeholder="coffee 35k #work · salary 15tr yesterday"
            data-autofocus
            value={smart}
            onChange={changeSmart}
            disabled={saving}
          />
          {smart.trim() && (
            <p className={styles.understood} role="status">
              {parsed.amount
                ? 'Filled in below. Change anything before you save.'
                : 'No amount found in the text. Type one below.'}
            </p>
          )}
        </div>

        <div className={form.field}>
          <label className={form.label} htmlFor="quick-amount">
            Amount
          </label>
          <div className={form.amountBox}>
            <input
              id="quick-amount"
              className={`${form.amountInput} ${form[tone]}`}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={amount ? formatNumber(Number(amount)) : ''}
              onChange={changeAmount}
              disabled={saving}
            />
            <span>₫</span>
          </div>
        </div>

        <fieldset className={form.fieldset}>
          <legend className={form.label}>Category</legend>
          {renderCategories()}
        </fieldset>

        <div className={form.row}>
          <div className={form.field}>
            <label className={form.label} htmlFor="quick-date">
              Date
            </label>
            <input
              id="quick-date"
              className={form.input}
              type="date"
              value={date}
              onChange={(event) => setField('date', event.target.value)}
              disabled={saving}
            />
          </div>
          <div className={form.field}>
            <label className={form.label} htmlFor="quick-note">
              Note
            </label>
            <input
              id="quick-note"
              className={form.input}
              autoComplete="off"
              placeholder="Optional"
              maxLength={200}
              value={note}
              onChange={(event) => setField('note', event.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className={form.field}>
          <label className={form.label} htmlFor="quick-tags">
            Tags
          </label>
          <TagInput
            id="quick-tags"
            value={tags}
            onChange={(next) => setField('tags', next)}
            suggestions={knownTags ?? []}
            disabled={saving}
          />
        </div>

        {formError && <Alert>{formError}</Alert>}

        <div className={form.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
