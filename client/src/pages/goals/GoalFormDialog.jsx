import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGoal, updateGoal } from '../../api/goals.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cssVar } from '../../utils/cssVar.js';
import { formatNumber } from '../../utils/format.js';
import { toDateInput, todayInput } from '../../utils/vnDate.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Icon from '../../components/Icon.jsx';
// Same fields as the "Add transaction" dialog, so it uses the same styles
import fields from '../transactions/TransactionFormDialog.module.css';
import styles from './GoalFormDialog.module.css';

// The 8 preset colors, in the fixed order of docs/ui-style.md (--chart-1 … --chart-8 in tokens.css),
// the same ones as the categories.
const PRESETS = [
  { token: '--chart-1', name: 'sky' },
  { token: '--chart-2', name: 'coral' },
  { token: '--chart-3', name: 'teal' },
  { token: '--chart-4', name: 'apricot' },
  { token: '--chart-5', name: 'periwinkle' },
  { token: '--chart-6', name: 'mint' },
  { token: '--chart-7', name: 'cornflower' },
  { token: '--chart-8', name: 'lime' },
];

// "New goal" dialog, or "Edit goal" when `goal` is given.
// The page mounts it only while it is open, so the fields start from the props each time.
// onSaved(goal) receives the goal returned by the API.
export default function GoalFormDialog({ goal, onSaved, onClose }) {
  const { t } = useTranslation();
  const isEdit = Boolean(goal);

  // The API stores a hex code like "#4A9FE3", so each preset's value is read from its token (in upper case).
  const colors = useMemo(() => PRESETS.map((preset) => ({ ...preset, hex: cssVar(preset.token).toUpperCase() })), []);

  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : ''); // digits only
  const [deadline, setDeadline] = useState(goal?.deadline ? toDateInput(goal.deadline) : '');
  const [color, setColor] = useState(goal?.color.toUpperCase() ?? colors[0].hex);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // VND has no decimals: keep only the digits (the box shows them with dots: 20.000.000).
  function changeTarget(event) {
    setTarget(event.target.value.replace(/\D/g, '').slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic checks first; the server validates again.
    if (!name.trim()) return setError(t('form.enterName'));
    if (!Number(target)) return setError(t('goals.enterTarget'));
    // A new goal needs a deadline after today. An old goal may keep a deadline that has passed.
    // Same format, so comparing the strings compares the days.
    if (!isEdit && deadline && deadline <= todayInput()) return setError(t('goals.deadlineFuture'));

    const data = { name: name.trim(), targetAmount: Number(target), deadline: deadline || null, color };

    setError('');
    setSaving(true);
    try {
      const saved = isEdit ? await updateGoal(goal._id, data) : await createGoal(data);
      // The page closes the dialog and updates the list.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? t('goals.edit') : t('goals.new')} onClose={onClose} busy={saving}>
      <form className={fields.form} onSubmit={handleSubmit} noValidate>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="goal-name">
            {t('common.name')}
          </label>
          <input
            id="goal-name"
            className={fields.input}
            autoComplete="off"
            placeholder={t('goals.namePlaceholder')}
            maxLength={60}
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor="goal-target">
            {t('goals.target')}
          </label>
          <div className={fields.amountBox}>
            <input
              id="goal-target"
              className={fields.amountInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={target ? formatNumber(Number(target)) : ''}
              onChange={changeTarget}
            />
            <span>₫</span>
          </div>
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor="goal-deadline">
            {t('goals.deadline')}
          </label>
          <input
            id="goal-deadline"
            className={fields.input}
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>

        <fieldset className={fields.fieldset}>
          <legend className={fields.label}>{t('common.color')}</legend>
          <div className={styles.swatches}>
            {colors.map((preset) => {
              const selected = preset.hex === color;
              return (
                <button
                  key={preset.token}
                  type="button"
                  className={`${styles.swatch} ${selected ? styles.swatchSelected : ''}`}
                  style={{ '--tone': `var(${preset.token})` }}
                  aria-label={t(`colors.${preset.name}`)}
                  aria-pressed={selected}
                  disabled={saving}
                  onClick={() => setColor(preset.hex)}
                >
                  {selected && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {isEdit && <p className={fields.hint}>{t('goals.editHint')}</p>}

        {error && <Alert>{error}</Alert>}

        <div className={fields.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('goals.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
