import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoredBoolean } from '../../hooks/useStoredBoolean.js';
import Card, { CardHeader } from '../Card/Card.jsx';
import Icon from '../Icon.jsx';
import styles from './CollapsibleCard.module.css';

// A large card that folds up to its title. A chevron in the corner folds and opens it, and this device remembers it per card.
// id: unique on the site, for example 'dashboard.budgetAlerts'. icon, tone, title, subtitle: as in CardHeader.
// actions: what is shown on the right of the title (a button, a legend). Anything else goes to the Card.
// The content stays mounted while it is folded (`inert` keeps the keyboard out), so a chart does not load or draw again.
// The movement is a CSS transition of a grid row, which the rule in global.css turns off with prefers-reduced-motion.
export default function CollapsibleCard({ id, icon, tone, title, subtitle, actions, className = '', children, ...rest }) {
  const { t } = useTranslation();
  const bodyId = useId();
  const [collapsed, setCollapsed] = useStoredBoolean(`ledgerling.card.${id}`);

  return (
    <Card className={`${styles.card} ${collapsed ? styles.collapsed : ''} ${className}`} data-collapsed={collapsed} data-card={id} {...rest}>
      <div className={styles.header}>
        <CardHeader icon={icon} tone={tone} title={title} subtitle={subtitle}>
          {actions}
        </CardHeader>
      </div>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        aria-label={t(collapsed ? 'card.expand' : 'card.collapse', { title })}
        title={t(collapsed ? 'card.expand' : 'card.collapse', { title })}
        onClick={() => setCollapsed((value) => !value)}
      >
        <Icon name="chevronDown" size={18} />
      </button>
      <div id={bodyId} className={styles.body}>
        <div className={styles.inner} inert={collapsed}>
          {children}
        </div>
      </div>
    </Card>
  );
}
