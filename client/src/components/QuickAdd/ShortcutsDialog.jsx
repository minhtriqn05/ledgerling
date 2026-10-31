import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal.jsx';
import Button from '../Button/Button.jsx';
import styles from './ShortcutsDialog.module.css';

// The list of keyboard shortcuts (opened with the ? key or the link in the footer).
// Keep it in step with the handlers in AppLayout.
export const SHORTCUTS = [
  { keys: 'N', actionKey: 'shortcuts.quickAdd' },
  { keys: '/', actionKey: 'shortcuts.search' },
  { keys: '?', actionKey: 'shortcuts.help' },
  { keys: 'Esc', actionKey: 'shortcuts.close' },
];

export default function ShortcutsDialog({ onClose }) {
  const { t } = useTranslation();

  return (
    <Modal title={t('shortcuts.title')} onClose={onClose}>
      <dl className={styles.list}>
        {SHORTCUTS.map(({ keys, actionKey }) => (
          <div key={keys} className={styles.row}>
            <dt>
              <kbd className={styles.key}>{keys}</kbd>
            </dt>
            <dd>{t(actionKey)}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>{t('shortcuts.note')}</p>
      <div className={styles.actions}>
        <Button onClick={onClose} data-autofocus>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
}
