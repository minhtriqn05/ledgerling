import Icon from '../Icon.jsx';
import styles from './Card.module.css';

// White card with rounded corners. `lift` makes it rise a little on hover (for cards that stand for one thing).
// Any other prop (style, aria-label...) goes straight to the <div>.
export default function Card({ className = '', lift = false, children, ...rest }) {
  return (
    <div className={`${styles.card} ${lift ? styles.lift : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

// Card title with a small icon tile in an accent color.
// tone: an accent name from tokens.css (sky, coral, teal, sun, periwinkle, mint).
// children (optional) are shown on the right, e.g. a legend or a "View all" link.
export function CardHeader({ icon, tone = 'sky', title, subtitle, children }) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        <span className={styles.tile} style={{ '--tone': `var(--accent-${tone})` }}>
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
