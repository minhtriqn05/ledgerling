import { resolveCategoryIcon } from '../../utils/categoryIcons.js';
import styles from './CategoryMark.module.css';

// The small tile in front of a category name: a line icon on a light tint of the category's color.
// The icon comes from the category (or is guessed from its name), see utils/categoryIcons.js.
// The name next to it already says everything, so the tile is hidden from screen readers.
// size: 'sm' (chips, legends), 'md' (lists) or 'lg' (cards, list rows).
const ICON_SIZES = { sm: 14, md: 18, lg: 20 };

export default function CategoryMark({ category, size = 'sm' }) {
  const { Icon, emoji } = resolveCategoryIcon(category);

  return (
    <span
      className={`${styles.mark} ${styles[size]}`}
      style={{ '--tone': category.color }}
      data-testid="category-mark"
      aria-hidden="true"
    >
      {Icon ? <Icon size={ICON_SIZES[size]} strokeWidth={2} /> : emoji}
    </span>
  );
}
