import Icon from '../Icon.jsx';
import styles from '../MonthPicker/MonthPicker.module.css';

// Like MonthPicker, for a whole year: a pill with the year and previous / next arrows.
// year is "YYYY" (text); onChange gets the new year as "YYYY" text.
const MIN_YEAR = 1970;
const MAX_YEAR = 2100;

export default function YearPicker({ year, onChange }) {
  const number = Number(year);

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Previous year"
        disabled={number <= MIN_YEAR}
        onClick={() => onChange(String(number - 1))}
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <span aria-live="polite">{year}</span>
      <button
        type="button"
        className={styles.arrow}
        aria-label="Next year"
        disabled={number >= MAX_YEAR}
        onClick={() => onChange(String(number + 1))}
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
