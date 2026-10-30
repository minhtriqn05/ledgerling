import { useState } from 'react';
import { bulkChangeCategory } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import Icon from '../../components/Icon.jsx';
import form from './TransactionFormDialog.module.css';
import styles from './BulkCategoryDialog.module.css';

// Moves the ticked transactions to one category (the type of each follows the category).
// ids: the ids of the ticked rows, categories: all the user's categories.
// onChanged({ updated, category }) runs after the API said OK.
export default function BulkCategoryDialog({ ids, categories, onChanged, onClose }) {
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const label = `${ids.length} ${ids.length === 1 ? 'transaction' : 'transactions'}`;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!categoryId) return setError('Please choose a category.');

    setError('');
    setSaving(true);
    try {
      const { updated } = await bulkChangeCategory(ids, categoryId);
      onChanged({ updated, category: categories.find((c) => c._id === categoryId) });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title="Change category" onClose={onClose} busy={saving}>
      <form className={form.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.text}>
          Move the selected {label} to:
        </p>

        <fieldset className={form.fieldset}>
          <legend className={styles.srOnly}>New category</legend>
          {['expense', 'income'].map((type) => {
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
                        onClick={() => setCategoryId(c._id)}
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
          })}
        </fieldset>

        <p className={styles.hint}>Moving to an income category turns an expense into income, and the other way round.</p>

        {error && <Alert>{error}</Alert>}

        <div className={form.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Change category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
