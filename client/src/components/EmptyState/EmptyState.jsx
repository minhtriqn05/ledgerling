import Card from '../Card/Card.jsx';
import Icon from '../Icon.jsx';
import styles from './EmptyState.module.css';

// Shown instead of a list that has nothing in it yet: three soft circles behind an icon,
// a title, a short text and (optional) an action button passed as children.
// titleAs: the heading level of the title; h2 under the title of a page, h1 when it is the whole page (FullPageMessage).
export default function EmptyState({ icon, title, text, titleAs: Title = 'h2', children }) {
  return (
    <Card className={styles.empty}>
      <div className={styles.art} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobSky}`} />
        <span className={`${styles.blob} ${styles.blobMint}`} />
        <span className={`${styles.blob} ${styles.blobSun}`} />
        <span className={styles.icon}>
          <Icon name={icon} size={26} />
        </span>
      </div>
      <Title className={styles.title}>{title}</Title>
      <p className={styles.text}>{text}</p>
      {children}
    </Card>
  );
}
