import { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion, usePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import IconButton from '../IconButton/IconButton.jsx';
import styles from './Drawer.module.css';

const EASE = [0.22, 0.61, 0.36, 1];
const EXIT_MS = 220;

// A panel that slides in from the right, over a dimmed page. Like Modal it is a native <dialog>, so the keyboard
// focus stays inside and Escape closes it. Render it inside <AnimatePresence> to play the closing animation.
// `above` is shown at the top of the panel, over the title (the breadcrumb of the page: it is behind the dimmed area
// otherwise, where it could not be clicked).
export default function Drawer({ title, onClose, above = null, children }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    const dialog = dialogRef.current;
    // StrictMode runs effects twice in dev; showModal() on an open dialog would throw.
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (isPresent) return undefined;
    const timer = setTimeout(safeToRemove, reduced ? 0 : EXIT_MS);
    return () => clearTimeout(timer);
  }, [isPresent, safeToRemove, reduced]);

  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  function handleClick(event) {
    if (event.target === dialogRef.current) onClose();
  }

  const transition = reduced ? { duration: 0 } : { duration: isPresent ? 0.32 : EXIT_MS / 1000, ease: EASE };

  return (
    <motion.dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-labelledby={titleId}
      data-testid="drawer"
      onCancel={handleCancel}
      onClick={handleClick}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: isPresent ? 1 : 0 }}
      transition={transition}
    >
      <motion.div
        className={styles.panel}
        initial={reduced ? false : { x: '100%' }}
        animate={{ x: isPresent ? 0 : '100%' }}
        transition={transition}
      >
        {above}
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="x" label={t('common.close')} onClick={onClose} />
        </div>
        {children}
      </motion.div>
    </motion.dialog>
  );
}
