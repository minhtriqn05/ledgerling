import Modal from '../Modal/Modal.jsx';
import Button from '../Button/Button.jsx';
import styles from './ShortcutsDialog.module.css';

// The list of keyboard shortcuts (opened with the ? key or the link in the footer).
// Keep it in step with the handlers in AppLayout.
export const SHORTCUTS = [
  { keys: 'N', action: 'Quick add a transaction' },
  { keys: '/', action: 'Search your transactions' },
  { keys: '?', action: 'Show this list' },
  { keys: 'Esc', action: 'Close a dialog' },
];

export default function ShortcutsDialog({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <dl className={styles.list}>
        {SHORTCUTS.map(({ keys, action }) => (
          <div key={keys} className={styles.row}>
            <dt>
              <kbd className={styles.key}>{keys}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>Shortcuts are ignored while you are typing in a field.</p>
      <div className={styles.actions}>
        <Button onClick={onClose} data-autofocus>
          Close
        </Button>
      </div>
    </Modal>
  );
}
