import styles from './Skeleton.module.css';

// A grey, softly pulsing block that holds the place of text or a picture while data loads.
// width / height are any CSS length; round makes it a circle or a pill.
export default function Skeleton({ width = '100%', height = '1em', round = false }) {
  return (
    <span
      className={`${styles.block} ${round ? styles.round : ''}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// Placeholder for a table or a list: a round avatar, two lines of text and an amount on each row.
export function SkeletonRows({ count = 6 }) {
  return (
    <div className={styles.rows} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width="36px" height="36px" round />
          <div className={styles.lines}>
            <Skeleton width="45%" height="14px" />
            <Skeleton width="25%" height="12px" />
          </div>
          <Skeleton width="84px" height="16px" />
        </div>
      ))}
    </div>
  );
}

// Placeholder for a grid of cards (categories, budgets, goals).
export function SkeletonCards({ count = 6 }) {
  return (
    <div className={styles.cards} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton width="40px" height="40px" round />
          <Skeleton width="60%" height="16px" />
          <Skeleton width="90%" height="12px" />
        </div>
      ))}
    </div>
  );
}
