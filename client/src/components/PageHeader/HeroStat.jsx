import Icon from '../Icon.jsx';
import styles from './HeroStat.module.css';

// The numbers a page leads with, in the hero: <HeroStats label="Totals for October"><HeroStat .../><HeroStat .../></HeroStats>
export function HeroStats({ label, children }) {
  return (
    <section className={styles.row} aria-label={label}>
      {children}
    </section>
  );
}

// One pane of glass: a small icon, a label and the number. tone: 'income' | 'expense' colors the icon, nothing colors the number's meaning alone.
export function HeroStat({ tone = 'neutral', icon, label, value, testId }) {
  return (
    <div className={`${styles.stat} ${styles[tone]}`}>
      <span className={styles.head}>
        {icon && (
          <span className={styles.icon}>
            <Icon name={icon} size={14} />
          </span>
        )}
        {label}
      </span>
      <strong className={styles.value} data-testid={testId}>
        {value}
      </strong>
    </div>
  );
}
