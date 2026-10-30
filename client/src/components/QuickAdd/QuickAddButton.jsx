import Icon from '../Icon.jsx';
import styles from './QuickAddButton.module.css';

// The round "+" button in the corner of every signed-in page. It opens the Quick add dialog (the N key does too).
// The accessible name is "Quick add"; the title is the tooltip with the shortcut.
export default function QuickAddButton({ onClick }) {
  return (
    <button type="button" className={styles.fab} aria-label="Quick add" title="Quick add (N)" onClick={onClick}>
      <Icon name="plus" size={26} />
    </button>
  );
}
