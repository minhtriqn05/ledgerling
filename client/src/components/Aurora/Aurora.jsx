import { useRef } from 'react';
import { usePauseOffscreen } from '../../hooks/usePauseOffscreen.js';
import styles from './Aurora.module.css';

// The soft moving light behind a hero: three blurred circles (emerald, ice, a little warmth) on a dark base, with a
// fine grain on top. Decoration only. It fills its nearest positioned parent and takes the parent's rounded corners.
// With prefers-reduced-motion the circles stand still (global.css), and paper never shows them.
// Out of the window (scrolled away) the circles wait, so the GPU does not draw them for nobody (usePauseOffscreen).
export default function Aurora({ className = '' }) {
  const ref = useRef(null);
  usePauseOffscreen(ref);

  return (
    <span ref={ref} className={`${styles.aurora} ${className}`} aria-hidden="true">
      <span className={`${styles.blob} ${styles.emerald}`} />
      <span className={`${styles.blob} ${styles.ice}`} />
      <span className={`${styles.blob} ${styles.warm}`} />
    </span>
  );
}
