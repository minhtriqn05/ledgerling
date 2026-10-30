import Icon from '../../components/Icon.jsx';
import styles from './StatCard.module.css';

// A number card of the Reports page. tone: 'income' | 'expense' | 'balance' (the vivid hero card) | 'neutral'.
// children (optional) go under the value, e.g. a ChangeBadge.
export default function StatCard({ tone, icon, label, value, children }) {
  return (
    <article className={`${styles.card} ${styles[tone]}`}>
      <span className={styles.tile}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        <strong className={styles.value}>{value}</strong>
        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </article>
  );
}
