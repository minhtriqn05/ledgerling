import { Link } from 'react-router-dom';
import { getInsights } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './InsightsCard.module.css';

// Icon and word for each severity. The word is read by screen readers, so color is never the only signal.
const SEVERITY = {
  warning: { icon: 'alert', word: 'Warning' },
  success: { icon: 'check', word: 'Good news' },
  info: { icon: 'info', word: 'Info' },
};

// "Insights" card: up to 6 tips about a month, built by the API from simple rules (GET /api/insights).
// Used on the Dashboard and on the Monthly tab of Reports. Like the other dashboard cards it loads its own data,
// so a failed request only affects this card. Four states: loading, error, no insights, the list.
export default function InsightsCard({ month }) {
  const { data, loading, error, reload } = useLoad(() => getInsights(month), [month]);

  function renderBody() {
    if (loading) return <p className={styles.note}>Loading insights…</p>;
    if (error) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>Insights could not be loaded.</p>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      );
    }
    if (data.insights.length === 0) {
      return <p className={styles.note}>No insights for {formatMonth(month)} yet. Add some transactions and tips will show up here.</p>;
    }

    return (
      <ul className={styles.list}>
        {data.insights.map((insight) => {
          const severity = SEVERITY[insight.severity] ?? SEVERITY.info;
          return (
            <li key={`${insight.type}-${insight.message}`}>
              <Link to={insight.link} className={`${styles.item} ${styles[insight.severity]}`}>
                <span className={styles.tile}>
                  <Icon name={severity.icon} size={16} />
                </span>
                <span className={styles.message}>
                  <span className={styles.visually}>{severity.word}: </span>
                  {insight.message}
                </span>
                <span className={styles.chevron}>
                  <Icon name="chevronRight" size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card aria-label="Insights">
      <CardHeader icon="bulb" tone="periwinkle" title="Insights" subtitle={formatMonth(month)} />
      {renderBody()}
    </Card>
  );
}
