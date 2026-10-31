import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getInsights } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatDayMonth, formatNumber, formatVnd } from '../../utils/format.js';
import { formatMonth, fromDateInput } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Button from '../../components/Button/Button.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './InsightsCard.module.css';

// Icon and word for each severity. The word is read by screen readers, so color is never the only signal.
const SEVERITY = {
  warning: { icon: 'alert', wordKey: 'insights.warning' },
  success: { icon: 'check', wordKey: 'insights.goodNews' },
  info: { icon: 'info', wordKey: 'insights.info' },
};

// The params of an insight that hold money, in the text of the user's language
const MONEY_PARAMS = ['amount', 'spent', 'budget', 'projected'];

// The sentence of one insight in the user's language, built from its code and params.
// Without a known code the English message of the API is shown.
function insightText(insight, t, i18n) {
  const key = `insights.codes.${insight.code}`;
  // The params go along: a key with a count exists as key_one / key_other
  if (!insight.code || !i18n.exists(key, insight.params)) return insight.message;
  const values = { ...insight.params };
  MONEY_PARAMS.forEach((name) => {
    if (values[name] !== undefined) values[name] = formatVnd(values[name]);
  });
  // A percentage can have a decimal, which is written differently per language
  if (values.percent !== undefined) values.percent = formatNumber(values.percent);
  if (values.rate !== undefined) values.rate = formatNumber(values.rate);
  if (values.month) values.month = formatMonth(values.month);
  if (values.day) values.day = formatDayMonth(fromDateInput(values.day));
  return t(key, values);
}

// "Insights" card: up to 6 tips about a month, built by the API from simple rules (GET /api/insights).
// Used on the Dashboard and on the Monthly tab of Reports. Like the other dashboard cards it loads its own data,
// so a failed request only affects this card. Four states: loading, error, no insights, the list.
export default function InsightsCard({ month }) {
  const { t, i18n } = useTranslation();
  const { data, loading, error, reload } = useLoad(() => getInsights(month), [month]);

  function renderBody() {
    if (loading) return <LoadingState skeleton="rows" count={3}>{t('insights.loading')}</LoadingState>;
    if (error) {
      return (
        <div className={styles.invite}>
          <p className={styles.note}>{t('insights.failed')}</p>
          <Button variant="secondary" onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      );
    }
    if (data.insights.length === 0) {
      return <p className={styles.note}>{t('insights.empty', { month: formatMonth(month) })}</p>;
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
                  <span className={styles.visually}>{t(severity.wordKey)}: </span>
                  {insightText(insight, t, i18n)}
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
    <Card aria-label={t('insights.title')}>
      <CardHeader icon="bulb" tone="periwinkle" title={t('insights.title')} subtitle={formatMonth(month)} />
      {renderBody()}
    </Card>
  );
}
