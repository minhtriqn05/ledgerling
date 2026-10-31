import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createCategory, updateCategory } from '../../api/categories.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cssVar } from '../../utils/cssVar.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Icon from '../../components/Icon.jsx';
import IconPicker from '../../components/IconPicker/IconPicker.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './CategoryForm.module.css';

// The 8 preset category colors, in the fixed order of docs/ui-style.md (--chart-1 … --chart-8 in tokens.css).
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

// "New category" form, or "Edit category" when `category` is given.
// The page gives the form a new `key` each time it opens it, so the fields below start again from the props.
// onSaved(category) receives the category returned by the API.
export default function CategoryForm({ category, defaultType, autoFocus, onSaved, onCancel }) {
  const { t } = useTranslation();
  const typeOptions = [
    { value: 'expense', label: t('common.expense'), tone: 'expense' },
    { value: 'income', label: t('common.income'), tone: 'income' },
  ];
  const isEdit = Boolean(category);

  // The API stores a hex code like "#F07D62", so each preset's value is read from its token
  // (in upper case, like the default categories). Read once when the form opens.
  const colors = useMemo(() => PRESETS.map((preset) => ({ ...preset, hex: cssVar(preset.token).toUpperCase() })), []);

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState(category?.type ?? defaultType);
  const [color, setColor] = useState(category?.color.toUpperCase() ?? colors[0].hex);
  const [icon, setIcon] = useState(category?.icon ?? null); // an icon name (older categories: an emoji), or null for Auto
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic check first; the server validates again.
    if (!name.trim()) return setError(t('form.enterName'));

    setError('');
    setSaving(true);
    try {
      // The type cannot be changed, so an edit only sends the name, the color and the icon (null removes it).
      const saved = isEdit
        ? await updateCategory(category._id, { name: name.trim(), color, icon })
        : await createCategory({ name: name.trim(), type, color, icon });
      // The page updates the list and opens a fresh form, so there is nothing to reset here.
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err)); // e.g. "Category already exists"
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={isEdit ? 'edit' : 'plus'}
        tone="sky"
        title={isEdit ? t('categories.edit') : t('categories.new')}
        subtitle={isEdit ? t('categories.editSubtitle') : t('categories.newSubtitle')}
      />

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label={t('common.name')}
          placeholder={t('categories.namePlaceholder')}
          autoComplete="off"
          maxLength={30}
          autoFocus={autoFocus}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {/* fieldset + legend give each group of buttons a name that screen readers announce. */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('common.type')}</legend>
          <SegmentedControl block options={typeOptions} value={type} onChange={setType} disabled={isEdit} />
          {isEdit && <p className={styles.hint}>{t('categories.typeLocked')}</p>}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('common.color')}</legend>
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
                  onClick={() => setColor(preset.hex)}
                >
                  {selected && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('common.icon')}</legend>
          <IconPicker value={icon} onChange={setIcon} color={color} disabled={saving} />
        </fieldset>

        {/* How the category will look in lists: a chip with its icon. */}
        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t('common.preview')}</span>
          <span className={styles.chip} style={{ '--tone': color }}>
            <CategoryMark category={{ name, color, icon }} />
            <span className={styles.chipText}>{name.trim() || t('categories.namePreview')}</span>
          </span>
        </div>

        {error && <Alert>{error}</Alert>}

        {isEdit ? (
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        ) : (
          <Button type="submit" block disabled={saving}>
            {saving ? t('common.creating') : t('categories.create')}
          </Button>
        )}
      </form>
    </Card>
  );
}
