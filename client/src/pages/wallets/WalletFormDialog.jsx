import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createWallet, updateWallet } from '../../api/wallets.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cssVar } from '../../utils/cssVar.js';
import { formatNumber } from '../../utils/format.js';
import { WALLET_TYPES } from '../../utils/wallets.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
// Same fields and swatches as the other dialogs, so it uses their styles
import fields from '../transactions/TransactionFormDialog.module.css';
import swatches from '../goals/GoalFormDialog.module.css';

// The 8 preset colors, in the fixed order of docs/ui-style.md (--chart-1 … --chart-8 in tokens.css), the same ones as the categories.
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

// "New wallet" dialog, or "Edit wallet" when `wallet` is given. The page mounts it only while it is open.
// onSaved(wallet) receives the wallet returned by the API.
export default function WalletFormDialog({ wallet, onSaved, onClose }) {
  const { t } = useTranslation();
  const isEdit = Boolean(wallet);
  const colors = useMemo(() => PRESETS.map((preset) => ({ ...preset, hex: cssVar(preset.token).toUpperCase() })), []);

  const [name, setName] = useState(wallet?.name ?? '');
  const [type, setType] = useState(wallet?.type ?? 'bank');
  const [color, setColor] = useState(wallet?.color.toUpperCase() ?? colors[0].hex);
  const [initial, setInitial] = useState(wallet ? String(wallet.initialBalance) : ''); // digits only
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // VND has no decimals: keep only the digits (the box shows them with dots: 5.000.000).
  function changeInitial(event) {
    setInitial(event.target.value.replace(/\D/g, '').slice(0, 13));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return setError(t('form.enterName'));

    const data = { name: name.trim(), type, color, initialBalance: Number(initial) };
    setError('');
    setSaving(true);
    try {
      onSaved(isEdit ? await updateWallet(wallet._id, data) : await createWallet(data));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? t('wallets.edit') : t('wallets.new')} onClose={onClose} busy={saving}>
      <form className={fields.form} onSubmit={handleSubmit} noValidate>
        <div className={fields.field}>
          <label className={fields.label} htmlFor="wallet-name">
            {t('common.name')}
          </label>
          <input
            id="wallet-name"
            className={fields.input}
            autoComplete="off"
            placeholder={t('wallets.namePlaceholder')}
            maxLength={30}
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <SegmentedControl
          block
          label={t('wallets.type.label')}
          options={WALLET_TYPES.map((option) => ({ value: option.value, label: t(`wallets.type.${option.value}`) }))}
          value={type}
          onChange={setType}
          disabled={saving}
        />

        <div className={fields.field}>
          <label className={fields.label} htmlFor="wallet-initial">
            {t('wallets.initialBalance')}
          </label>
          <div className={fields.amountBox}>
            <input
              id="wallet-initial"
              className={fields.amountInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={initial ? formatNumber(Number(initial)) : ''}
              onChange={changeInitial}
            />
            <span>₫</span>
          </div>
          <p className={fields.hint}>{isEdit && wallet.isDefault ? t('wallets.defaultHint') : t('wallets.initialHint')}</p>
        </div>

        <fieldset className={fields.fieldset}>
          <legend className={fields.label}>{t('common.color')}</legend>
          <div className={swatches.swatches}>
            {colors.map((preset) => {
              const selected = preset.hex === color;
              return (
                <button
                  key={preset.token}
                  type="button"
                  className={`${swatches.swatch} ${selected ? swatches.swatchSelected : ''}`}
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

        {error && <Alert>{error}</Alert>}

        <div className={fields.actions}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button needsNetwork type="submit" disabled={saving}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('wallets.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
