import { useLocation } from 'react-router-dom';
import { useTopProgress } from '../../hooks/useTopProgress.js';
import styles from './TopProgress.module.css';

// The thin bar along the top edge of the window, while a page opens or data is on its way.
// Decoration: the pages announce their own loading state to a screen reader.
export default function TopProgress() {
  const { pathname } = useLocation();
  const visible = useTopProgress(pathname);
  if (!visible) return null;

  return (
    <div className={styles.track} aria-hidden="true" data-testid="top-progress">
      <span className={styles.bar} />
    </div>
  );
}
