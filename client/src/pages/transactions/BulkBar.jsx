import Button from '../../components/Button/Button.jsx';
import styles from './BulkBar.module.css';

// The bar above the list while at least one row is ticked: how many, and what can be done with them.
// It is a role="region" so a screen reader finds it; the count is announced politely when it changes.
export default function BulkBar({ count, onChangeCategory, onDelete, onClear }) {
  return (
    <div className={styles.bar} role="region" aria-label="Bulk actions">
      <span className={styles.count} role="status">
        {count} selected
      </span>
      <div className={styles.actions}>
        <Button variant="secondary" icon="categories" onClick={onChangeCategory}>
          Change category
        </Button>
        <Button variant="danger" icon="trash" onClick={onDelete}>
          Delete selected
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  );
}
