import { useMemo, useState } from 'react';
import { createCategory, updateCategory } from '../../api/categories.js';
import { getErrorMessage } from '../../api/axios.js';
import { cssVar } from '../../utils/cssVar.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import TextField from '../../components/TextField/TextField.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './CategoryForm.module.css';

// The 8 preset category colors, in the fixed order of docs/ui-style.md (--chart-1 … --chart-8 in tokens.css).
const PRESETS = [
  { token: '--chart-1', name: 'Sky' },
  { token: '--chart-2', name: 'Coral' },
  { token: '--chart-3', name: 'Teal' },
  { token: '--chart-4', name: 'Apricot' },
  { token: '--chart-5', name: 'Periwinkle' },
  { token: '--chart-6', name: 'Mint' },
  { token: '--chart-7', name: 'Cornflower' },
  { token: '--chart-8', name: 'Lime' },
];

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', tone: 'expense' },
  { value: 'income', label: 'Income', tone: 'income' },
];

// "New category" form, or "Edit category" when `category` is given.
// The page gives the form a new `key` each time it opens it, so the fields below start again from the props.
// onSaved(category) receives the category returned by the API.
export default function CategoryForm({ category, defaultType, autoFocus, onSaved, onCancel }) {
  const isEdit = Boolean(category);

  // The API stores a hex code like "#F07D62", so each preset's value is read from its token
  // (in upper case, like the default categories). Read once when the form opens.
  const colors = useMemo(() => PRESETS.map((preset) => ({ ...preset, hex: cssVar(preset.token).toUpperCase() })), []);

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState(category?.type ?? defaultType);
  const [color, setColor] = useState(category?.color.toUpperCase() ?? colors[0].hex);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Basic check first; the server validates again.
    if (!name.trim()) return setError('Please enter a name.');

    setError('');
    setSaving(true);
    try {
      // The type cannot be changed, so an edit only sends the name and the color.
      const saved = isEdit
        ? await updateCategory(category._id, { name: name.trim(), color })
        : await createCategory({ name: name.trim(), type, color });
      // The page updates the list and opens a fresh form, so there is nothing to reset here.
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        icon={isEdit ? 'edit' : 'plus'}
        tone="sky"
        title={isEdit ? 'Edit category' : 'New category'}
        subtitle={isEdit ? 'Change the name or color' : 'Name, type and color'}
      />

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          label="Name"
          placeholder="e.g. Coffee"
          autoComplete="off"
          maxLength={30}
          autoFocus={autoFocus}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        {/* fieldset + legend give each group of buttons a name that screen readers announce. */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Type</legend>
          <SegmentedControl block options={TYPE_OPTIONS} value={type} onChange={setType} disabled={isEdit} />
          {isEdit && <p className={styles.hint}>Type can't be changed after a category is created.</p>}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Color</legend>
          <div className={styles.swatches}>
            {colors.map((preset) => {
              const selected = preset.hex === color;
              return (
                <button
                  key={preset.token}
                  type="button"
                  className={`${styles.swatch} ${selected ? styles.swatchSelected : ''}`}
                  style={{ '--tone': `var(${preset.token})` }}
                  aria-label={preset.name}
                  aria-pressed={selected}
                  onClick={() => setColor(preset.hex)}
                >
                  {selected && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* How the category will look in lists: a chip with a dot in its color. */}
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Preview</span>
          <span className={styles.chip} style={{ '--tone': color }}>
            <span className={styles.dot} />
            <span className={styles.chipText}>{name.trim() || 'Category name'}</span>
          </span>
        </div>

        {error && <Alert>{error}</Alert>}

        {isEdit ? (
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        ) : (
          <Button type="submit" block disabled={saving}>
            {saving ? 'Creating…' : 'Create category'}
          </Button>
        )}
      </form>
    </Card>
  );
}
