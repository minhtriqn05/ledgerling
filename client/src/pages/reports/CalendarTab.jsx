import { useNavigate } from 'react-router-dom';
import { getMonthlyReport } from '../../api/reports.js';
import { useLoad } from '../../hooks/useLoad.js';
import { formatCompact, formatVnd } from '../../utils/format.js';
import { buildCalendar, dayTransactionsPath, formatLongDay } from '../../utils/reports.js';
import { formatMonth } from '../../utils/vnDate.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import LoadingState from '../../components/LoadingState/LoadingState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import styles from './CalendarTab.module.css';

// Weeks start on Monday
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The Calendar tab: a month grid made with CSS grid. A day is darker the more was spent on it
// (4 steps, relative to the busiest day). A click on a day opens the Transactions page filtered to that day.
// The numbers come from the same request as the Monthly tab (GET /api/reports/monthly).
export default function CalendarTab({ month }) {
  const navigate = useNavigate();
  const { data: report, loading, error, reload } = useLoad(() => getMonthlyReport(month), [month]);

  if (loading) return <LoadingState spacious>Loading calendar…</LoadingState>;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { cells } = buildCalendar(month, report.dailyExpense);

  return (
    <Card>
      <CardHeader icon="calendar" tone="teal" title="Spending calendar" subtitle={formatMonth(month)}>
        <p className={styles.total}>
          Spent this month: <strong>{formatVnd(report.totals.expense)}</strong>
        </p>
      </CardHeader>

      <div className={styles.grid} role="group" aria-label={`Calendar of ${formatMonth(month)}`}>
        {WEEKDAYS.map((weekday) => (
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
              aria-label={`${formatLongDay(cell.date)}: ${cell.total > 0 ? `spent ${formatVnd(cell.total)}` : 'no spending'}`}
              onClick={() => navigate(dayTransactionsPath(cell.date))}
            >
              <span className={styles.dayNumber}>{cell.day}</span>
              {cell.total > 0 && <span className={styles.dayAmount}>{formatCompact(cell.total)}</span>}
            </button>
          )
        )}
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`${styles.swatch} ${styles[`level${level}`]}`} />
        ))}
        <span>More</span>
      </div>
      <p className={styles.hint}>Click a day to see its transactions.</p>
    </Card>
  );
}
