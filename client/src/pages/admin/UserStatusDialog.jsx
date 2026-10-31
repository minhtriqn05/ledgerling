import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setUserStatus } from '../../api/admin.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { nextStatus } from '../../utils/admin.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import styles from './UserStatusDialog.module.css';

// "Are you sure?" step before an account is disabled (or enabled again). onChanged(user, status) runs after the API said OK.
export default function UserStatusDialog({ user, onChanged, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const status = nextStatus(user);
  const disabling = status === 'disabled';

  async function handleConfirm() {
    setBusy(true);
    try {
      await setUserStatus(user._id, status);
      onChanged(user, status);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={t(disabling ? 'admin.dialog.disableTitle' : 'admin.dialog.enableTitle')} onClose={onClose} busy={busy}>
      <p className={styles.summary}>
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </p>
      <p className={styles.text}>{t(disabling ? 'admin.dialog.disableText' : 'admin.dialog.enableText', { name: user.name })}</p>

      <div className={styles.actions}>
        {/* data-autofocus: keyboard users land on the safe choice (see Modal) */}
        <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>
          {t('common.cancel')}
        </Button>
        <Button variant={disabling ? 'danger' : 'primary'} onClick={handleConfirm} disabled={busy}>
          {busy
            ? t(disabling ? 'admin.dialog.disabling' : 'admin.dialog.enabling')
            : t(disabling ? 'admin.users.disable' : 'admin.users.enable')}
        </Button>
      </div>
    </Modal>
  );
}
