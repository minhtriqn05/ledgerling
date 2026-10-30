import { useId, useState } from 'react';
import Card from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import styles from './CategoryCard.module.css';

// One category in the grid. The card gets the category's own color (from the API) as --tone:
// the stripe on top and the letter avatar use it.
// Delete is confirmed inside the card: its content swaps to a question with Cancel / Delete.
export default function CategoryCard({ category, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleId = useId();

  async function handleDelete() {
    setDeleting(true);
    await onDelete(category);
    // On success the page has already removed this card. If the delete failed (the page shows the error),
    // the card goes back to normal.
    setDeleting(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <Card className={styles.card} style={{ '--tone': category.color }} role="group" aria-labelledby={titleId}>
        <h2 id={titleId} className={styles.name}>
          Delete "{category.name}"?
        </h2>
        <p className={styles.confirmText}>This can't be undone.</p>
        <div className={styles.confirmActions}>
          {/* autoFocus: keyboard users land on the safe choice */}
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.card} style={{ '--tone': category.color }}>
      <div className={styles.top}>
        <span className={`${styles.avatar} ${category.icon ? styles.avatarIcon : ''}`} aria-hidden="true">
          {category.icon || category.name.charAt(0).toUpperCase()}
        </span>
        <span className={styles.actions}>
          <IconButton icon="edit" size={16} label={`Edit ${category.name}`} onClick={() => onEdit(category)} />
          <IconButton
            icon="trash"
            size={16}
            label={`Delete ${category.name}`}
            danger
            onClick={() => setConfirming(true)}
          />
        </span>
      </div>
      <h2 className={styles.name}>{category.name}</h2>
    </Card>
  );
}
