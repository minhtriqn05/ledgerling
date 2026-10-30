import Icon from '../../components/Icon.jsx';
import { describeChange } from '../../utils/reports.js';
import styles from './ChangeBadge.module.css';

// "↑ 13.6%" / "↓ 8%" / "0%" / "No data last month": the change from last month as a small pill.
// kind decides which direction is good: more 'income' or 'balance' is green, more 'expense' is red.
// The arrow and the percent carry the meaning; the color only backs them up. A screen reader gets a full sentence.
export default function ChangeBadge({ percent, kind }) {
  const change = describeChange(percent, kind);

  return (
    <span className={`${styles.badge} ${styles[change.tone]}`}>
      <span className={styles.visually} data-testid="change-description">
        {change.description}
      </span>
      <span aria-hidden="true" className={styles.content}>
        {change.direction === 'up' && <Icon name="arrowUp" size={14} />}
        {change.direction === 'down' && <Icon name="arrowDown" size={14} />}
        {change.label}
      </span>
    </span>
  );
}
