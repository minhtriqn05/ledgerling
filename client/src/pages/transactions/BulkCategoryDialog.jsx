import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!categoryId) return setError(t('form.chooseCategory'));

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
    <Modal title={t('transactions.changeCategory')} onClose={onClose} busy={saving}>
      <form className={form.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.text}>
          {t('transactions.moveTo', { count: ids.length })}
        </p>

        <fieldset className={form.fieldset}>
          <legend className={styles.srOnly}>{t('categories.new')}</legend>
          {['expense', 'income'].map((type) => {
            const group = categories.filter((c) => c.type === type);
            if (group.length === 0) return null;
            return (
              <div key={type} className={styles.group}>
                <span className={styles.groupLabel}>{t(`common.${type}`)}</span>
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
                          <CategoryMark category={c} />
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

        <p className={styles.hint}>{t('transactions.moveHint')}</p>

        {error && <Alert>{error}</Alert>}

        <div className={form.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : t('transactions.changeCategory')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
