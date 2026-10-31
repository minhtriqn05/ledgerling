import { useTranslation } from 'react-i18next';
import { SkeletonCards, SkeletonRows } from '../Skeleton/Skeleton.jsx';
import styles from './LoadingState.module.css';

// While data loads. role="status" lets screen readers announce it.
// skeleton: 'rows' (a table / list) or 'cards' (a grid) draws grey placeholder shapes instead of the text;
//   the text is then only for screen readers.
// count: how many placeholder rows / cards (a default is used when left out).
// spacious: more room around the text, for a whole page instead of a card.
// fullScreen: fills the window, for the check of the stored session before any page shows.
export default function LoadingState({ children, spacious = false, fullScreen = false, skeleton, count }) {
  const { t } = useTranslation();
  const text = children ?? t('common.loading');

  if (skeleton) {
    return (
      <div role="status" aria-busy="true">
        <span className={styles.srOnly}>{text}</span>
        {skeleton === 'cards' ? <SkeletonCards count={count} /> : <SkeletonRows count={count} />}
      </div>
    );
  }

  const className = [styles.loading, spacious && styles.spacious, fullScreen && styles.fullScreen]
    .filter(Boolean)
    .join(' ');

  return (
    <p className={className} role="status">
      {text}
    </p>
  );
}
