import { useEffect, useId, useRef } from 'react';
import IconButton from '../IconButton/IconButton.jsx';
import styles from './Modal.module.css';

// A dialog over a dimmed page. It uses the browser's own <dialog> element: showModal() keeps the keyboard focus
// inside, closes on Escape and makes the page behind unclickable.
// onClose is called for Escape, the X button and a click on the dimmed area.
// `busy` (e.g. while saving) stops all three, so a request in progress is not abandoned by accident.
export default function Modal({ title, onClose, busy = false, children }) {
  const dialogRef = useRef(null);
  const titleId = useId();

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

  // Escape fires "cancel". We close through onClose (the page unmounts the dialog) instead of the browser.
  function handleCancel(event) {
    event.preventDefault();
    if (!busy) onClose();
  }

  // The <dialog> itself is the dimmed area; the panel inside is the white box.
  function handleClick(event) {
    if (event.target === dialogRef.current && !busy) onClose();
  }

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-labelledby={titleId} onCancel={handleCancel} onClick={handleClick}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton icon="x" label="Close" onClick={onClose} disabled={busy} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
