import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonthlyReport } from '../../api/reports.js';
import { useWeekStart } from '../../context/AuthContext.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { formatCompact, formatVnd } from '../../utils/format.js';
import { buildCalendar, dayTransactionsPath, formatLongDay, weekdayLabels } from '../../utils/reports.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import styles from './CalendarTab.module.css';

// The Calendar tab: a month grid made with CSS grid. A day is darker the more was spent on it
// (4 steps, relative to the busiest day). A click on a day opens the Transactions page filtered to that day.
// The numbers come from the same request as the Monthly tab (GET /api/reports/monthly).
// The week starts on the day chosen in Settings (weekStartsOn: 'monday' | 'sunday'); a prop overrides it.
export default function CalendarTab({ month, weekStartsOn }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const preferredWeekStart = useWeekStart();
  const weekStart = weekStartsOn ?? preferredWeekStart;
  const { data: report, loading, error, reload, refresh } = useLoad(() => getMonthlyReport(month), [month]);
  useLiveRefresh(['transactions', 'categories'], refresh);

  if (loading) return <LoadingState skeleton="cards">{t('reports.loadingCalendar')}</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { cells } = buildCalendar(month, report.dailyExpense, weekStart);

  return (
    <Card>
      <CardHeader icon="calendar" tone="teal" title={t('reports.calendarTitle')} subtitle={formatMonth(month)}>
        <p className={styles.total}>
          {t('reports.spentThisMonth')} <strong>{formatVnd(report.totals.expense)}</strong>
        </p>
      </CardHeader>

      <div className={styles.grid} role="group" aria-label={t('reports.calendarOf', { month: formatMonth(month) })}>
        {weekdayLabels(weekStart).map((weekday) => (
          <span key={weekday} className={styles.weekday} aria-hidden="true">
            {weekday}
          </span>
        ))}

        {cells.map((cell, index) =>
          cell === null ? (
            <span key={`empty-${index}`} className={styles.empty} aria-hidden="true" />
          ) : (
            <button
              key={cell.date}
              type="button"
              className={`${styles.day} ${styles[`level${cell.level}`]}`}
              aria-label={
                cell.total > 0
                  ? t('reports.daySpent', { day: formatLongDay(cell.date), amount: formatVnd(cell.total) })
                  : t('reports.dayNoSpending', { day: formatLongDay(cell.date) })
              }
              onClick={() => navigate(dayTransactionsPath(cell.date))}
            >
              <span className={styles.dayNumber}>{cell.day}</span>
              {cell.total > 0 && <span className={styles.dayAmount}>{formatCompact(cell.total)}</span>}
            </button>
          )
        )}
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span>{t('reports.less')}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`${styles.swatch} ${styles[`level${level}`]}`} />
        ))}
        <span>{t('reports.more')}</span>
      </div>
      <p className={styles.hint}>{t('reports.calendarHint')}</p>
    </Card>
  );
}
