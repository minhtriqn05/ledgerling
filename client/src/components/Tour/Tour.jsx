import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { placeTourCard, TOUR_STEPS } from '../../utils/tour.js';
import Button from '../Button/Button.jsx';
import styles from './Tour.module.css';

// Where the element of a step is, or null when it is not on screen
function findTarget(step) {
  const rect = document.querySelector(`[data-tour="${step.target}"]`)?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.height > 0 ? rect : null;
}

// The guided tour, written by hand: the page goes dark except for one element, with a card next to it that explains it.
// A native <dialog> keeps the keyboard inside and lets Escape skip; the hole is a big shadow around a transparent box.
// onStepChange(step): AppLayout opens or closes the phone menu, where most of the elements live.
// menuOpen: the state of that menu, because the element only has its place once the menu is open.
export default function Tour({ onClose, onStepChange, menuOpen }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const cardRef = useRef(null);
  const titleId = useId();
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState(null);
  const [place, setPlace] = useState(null);
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    // StrictMode runs effects twice in dev; showModal() on an open dialog would throw.
    if (!dialog.open) dialog.showModal();
  }, []);

  const latestStepChange = useRef(onStepChange);
  useEffect(() => {
    latestStepChange.current = onStepChange;
  });

  useEffect(() => {
    latestStepChange.current?.(step);
    // The main button keeps the focus from step to step, also when Back disappears on the first one
    dialogRef.current.querySelector('[data-autofocus]')?.focus();
  }, [step]);

  useEffect(() => {
    function measure() {
      const target = findTarget(step);
      const card = cardRef.current;
      setSpot(target);
      setPlace(placeTourCard(target, { width: card.offsetWidth, height: card.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
    }

    // One frame later: the card has its size for this text by then
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [step, menuOpen]);

  // Escape fires "cancel"; the page closes the tour through onClose instead of the browser
  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-labelledby={titleId} data-keep-menu data-testid="tour" onCancel={handleCancel}>
      {spot ? (
        <span
          className={styles.spot}
          style={{ top: spot.top - 6, left: spot.left - 6, width: spot.width + 12, height: spot.height + 12 }}
          aria-hidden="true"
        />
      ) : (
        <span className={styles.dim} aria-hidden="true" />
      )}

      <div ref={cardRef} className={styles.card} style={place ?? { visibility: 'hidden' }}>
        <p className={styles.counter}>{t('tour.counter', { step: index + 1, total: TOUR_STEPS.length })}</p>
        <h2 id={titleId} className={styles.title}>
          {t(`tour.steps.${step.id}.title`)}
        </h2>
        <p className={styles.text}>{t(`tour.steps.${step.id}.text`)}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={onClose}>
            {t('tour.skip')}
          </button>
          <span className={styles.moves}>
            {index > 0 && (
              <Button variant="secondary" onClick={() => setIndex(index - 1)}>
                {t('common.back')}
              </Button>
            )}
            <Button data-autofocus onClick={() => (isLast ? onClose() : setIndex(index + 1))}>
              {isLast ? t('tour.done') : t('tour.next')}
            </Button>
          </span>
        </div>
      </div>
    </dialog>
  );
}
