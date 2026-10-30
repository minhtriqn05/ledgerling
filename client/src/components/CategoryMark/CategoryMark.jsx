import styles from './CategoryMark.module.css';

// The small sign in front of a category name: its emoji, or - when it has none - whatever is passed as children
// (usually the colored dot of that list). The name next to it already says everything, so it is hidden from screen readers.
//   <CategoryMark icon={category.icon}><i className={styles.dot} /></CategoryMark>
export default function CategoryMark({ icon, children = null }) {
  if (!icon) return children;
  return (
    <span className={styles.mark} aria-hidden="true">
      {icon}
    </span>
  );
}
