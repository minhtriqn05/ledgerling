import { useTranslation } from 'react-i18next';
import { formatMonth, shiftMonth } from '../../utils/vnDate.js';
import Icon from '../Icon.jsx';
import styles from './MonthPicker.module.css';

// Pill with the month name and previous / next arrows. month is "YYYY-MM"; onChange gets the new "YYYY-MM".
export default function MonthPicker({ month, onChange }) {
  const { t } = useTranslation();

  return (
    <div className={styles.picker}>
      <button type="button" className={styles.arrow} aria-label={t('picker.previousMonth')} onClick={() => onChange(shiftMonth(month, -1))}>
        <Icon name="chevronLeft" size={18} />
      </button>
      <span aria-live="polite">{formatMonth(month)}</span>
      <button type="button" className={styles.arrow} aria-label={t('picker.nextMonth')} onClick={() => onChange(shiftMonth(month, 1))}>
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
