import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import IconButton from '../../components/IconButton/IconButton.jsx';
import CategoryMark from '../../components/CategoryMark/CategoryMark.jsx';
import styles from './CategoryCard.module.css';

// One category in the grid. The card gets the category's own color (from the API) as --tone:
// the stripe on top and the icon tile use it.
// Delete is confirmed inside the card: its content swaps to a question with Cancel / Delete.
export default function CategoryCard({ category, onEdit, onDelete }) {
  const { t } = useTranslation();
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
          {t('categories.deleteQuestion', { name: category.name })}
        </h2>
        <p className={styles.confirmText}>{t('common.cannotUndo')}</p>
        <div className={styles.confirmActions}>
          {/* autoFocus: keyboard users land on the safe choice */}
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting} autoFocus>
            {t('common.cancel')}
          </Button>
          <Button needsNetwork variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.card} lift style={{ '--tone': category.color }}>
      <div className={styles.top}>
        <CategoryMark category={category} size="lg" />
        <span className={styles.actions}>
          <IconButton needsNetwork icon="edit" size={16} label={t('common.editName', { name: category.name })} onClick={() => onEdit(category)} />
          <IconButton needsNetwork
            icon="trash"
            size={16}
            label={t('common.deleteName', { name: category.name })}
            danger
            onClick={() => setConfirming(true)}
          />
        </span>
      </div>
      <h2 className={styles.name}>{category.name}</h2>
    </Card>
  );
}
