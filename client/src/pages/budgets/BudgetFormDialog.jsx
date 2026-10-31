import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { createBudget, updateBudget } from '../../api/budgets.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber } from '../../utils/format.js';
import { formatMonth } from '../../utils/vnDate.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Icon from '../../components/Icon.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './BudgetFormDialog.module.css';

// "Add budget" dialog, or "Edit budget" when `budget` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// availableCategories: the expense categories that have no budget in `month` yet (only used when adding).
// onSaved(budget) receives the budget returned by the API.
export default function BudgetFormDialog({ budget, month, availableCategories, onSaved, onClose }) {
  const { t } = useTranslation();
  const isEdit = Boolean(budget);

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState(budget ? String(budget.amount) : ''); // digits only
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // VND has no decimals: keep only the digits (the box shows them with dots: 5.000.000).
  function changeAmount(event) {
    setAmount(event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!isEdit && !categoryId) return setError(t('form.chooseCategory'));
    if (!Number(amount)) return setError(t('form.enterAmount'));

    setError('');
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateBudget(budget._id, Number(amount))
        : await createBudget({ categoryId, month, amount: Number(amount) });
      // The page closes the dialog and updates the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? t('budgets.edit') : t('budgets.add')} onClose={onClose} busy={saving}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.month}>{formatMonth(month)}</p>

        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>{t('common.category')}</legend>
          {isEdit ? (
            // The category cannot change after the budget is created.
            <div className={styles.categoryPicker}>
              <span className={`${styles.chip} ${styles.chipSelected}`} style={{ '--tone': budget.category.color }}>
                <CategoryMark category={budget.category} />
                {budget.category.name}
              </span>
            </div>
          ) : availableCategories.length === 0 ? (
            <p className={styles.hint}>
              <Trans
                i18nKey="budgets.allHaveBudget"
                values={{ month: formatMonth(month) }}
                components={{ link: <Link to="/categories" /> }}
              />
            </p>
          ) : (
            <div className={styles.categoryPicker}>
              {availableCategories.map((c) => {
                const selected = c._id === categoryId;
                return (
                  <button
                    key={c._id}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
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
          )}
        </fieldset>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="budget-amount">
            {t('budgets.monthlyLimit')}
          </label>
          <div className={styles.amountBox}>
            <input
              id="budget-amount"
              className={styles.amountInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              data-autofocus={isEdit ? '' : undefined}
              value={amount ? formatNumber(Number(amount)) : ''}
              onChange={changeAmount}
            />
            <span>₫</span>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button needsNetwork type="submit" disabled={saving || (!isEdit && availableCategories.length === 0)}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('budgets.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
