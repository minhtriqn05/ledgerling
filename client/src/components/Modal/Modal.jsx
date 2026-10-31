import { useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion, usePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import IconButton from '../IconButton/IconButton.jsx';
import styles from './Modal.module.css';

const EASE = [0.22, 0.61, 0.36, 1];
const EXIT_MS = 180;

// A dialog over a dimmed page. It uses the browser's own <dialog> element: showModal() keeps the keyboard focus
// inside, closes on Escape and makes the page behind unclickable.
// onClose is called for Escape, the X button and a click on the dimmed area.
// `busy` (e.g. while saving) stops all three, so a request in progress is not abandoned by accident.
// `wide` gives the panel more room (for a table).
// To play the closing animation, the page renders it inside <AnimatePresence>: usePresence tells the dialog it is
// leaving, and safeToRemove() lets React remove it once the animation has finished.
export default function Modal({ title, onClose, busy = false, wide = false, children }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    const dialog = dialogRef.current;
    // StrictMode runs effects twice in dev; showModal() on an open dialog would throw.
    if (!dialog.open) dialog.showModal();
    // React's autoFocus runs before the dialog is open, so it does not work here. An element marked with
    // data-autofocus gets the focus instead; without one, the browser focuses the first button (the X).
    dialog.querySelector('[data-autofocus]')?.focus();

    // The page behind must not scroll while the dialog is open.
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

  // Escape fires "cancel". We close through onClose (the page unmounts the dialog) instead of the browser.
  function handleCancel(event) {
    event.preventDefault();
    if (!busy) onClose();
  }

  // The <dialog> itself is the dimmed area; the panel inside is the white box.
  function handleClick(event) {
    if (event.target === dialogRef.current && !busy) onClose();
  }

  const transition = { duration: isPresent ? 0.24 : EXIT_MS / 1000, ease: EASE };

  return (
    <motion.dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: isPresent ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : transition}
    >
      <motion.div
        className={wide ? `${styles.panel} ${styles.wide}` : styles.panel}
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={isPresent ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
        transition={reduced ? { duration: 0 } : transition}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="x" label={t('common.close')} onClick={onClose} disabled={busy} />
        </div>
        {children}
      </motion.div>
    </motion.dialog>
  );
}
