import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currentMonth, formatMonth } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import YearPicker from '../components/YearPicker/YearPicker.jsx';
import Button from '../components/Button/Button.jsx';
import Icon from '../components/Icon.jsx';
import MonthlyTab from './reports/MonthlyTab.jsx';
import YearlyTab from './reports/YearlyTab.jsx';
import CalendarTab from './reports/CalendarTab.jsx';
import styles from './ReportsPage.module.css';

// Reports with three tabs: Monthly, Yearly and Calendar. Plan: docs/plans/reports.md.
// The tab and the period live in the URL (?tab=calendar&month=2026-10 or ?tab=yearly&year=2026), so F5 and shared
// links show the same report, and the insights on the Dashboard can link straight to a tab.

const TABS = [
  { id: 'monthly', label: 'Monthly', icon: 'chart' },
  { id: 'yearly', label: 'Yearly', icon: 'reports' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
];

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_REGEX = /^\d{4}$/;

// A value that is missing or hand-edited into nonsense falls back to its default, so the API never gets a value it refuses.
function readParams(searchParams) {
  const tab = searchParams.get('tab');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const validMonth = MONTH_REGEX.test(month ?? '') ? month : currentMonth();
  return {
    tab: TABS.some((t) => t.id === tab) ? tab : 'monthly',
    month: validMonth,
    // Without a year the Yearly tab shows the year of the chosen month
    year: YEAR_REGEX.test(year ?? '') && year >= 1970 && year <= 2100 ? year : validMonth.slice(0, 4),
  };
}

const SUBTITLES = {
  monthly: (month) => `How ${formatMonth(month)} compares with last month.`,
  yearly: (month, year) => `Income and expense of every month of ${year}.`,
  calendar: () => 'See which days you spent the most. Click a day to open its transactions.',
};

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab, month, year } = readParams(searchParams);
  const tabRefs = useRef({});

  // The month is always kept, so Monthly -> Yearly -> Calendar comes back to the same month. The year is only written on the
  // Yearly tab; without it the year of the month is used, so a new month never leaves an old year behind.
  function paramsFor(nextTab, changes = {}) {
    const next = { tab: nextTab, month: changes.month ?? month };
    if (nextTab === 'yearly') next.year = changes.year ?? year;
    return next;
  }

  function selectTab(nextTab) {
    setSearchParams(paramsFor(nextTab));
  }

  // The period arrows replace the history entry, so Back does not walk through every month that was clicked
  function changePeriod(changes) {
    setSearchParams(paramsFor(tab, changes), { replace: true });
  }

  // Arrow keys move between the tabs (and focus), like a native tab list
  function handleTabKeyDown(event, index) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    selectTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Reports" subtitle={SUBTITLES[tab](month, year)}>
        <div className={styles.noPrint}>
          {tab === 'yearly' ? (
            <YearPicker year={year} onChange={(nextYear) => changePeriod({ year: nextYear })} />
          ) : (
            <MonthPicker month={month} onChange={(nextMonth) => changePeriod({ month: nextMonth })} />
          )}
        </div>
        <Button variant="secondary" icon="print" className={styles.noPrint} onClick={() => window.print()}>
          Print
        </Button>
      </PageHeader>

      <div className={`${styles.tabs} ${styles.noPrint}`} role="tablist" aria-label="Report type">
        {TABS.map((t, index) => (
          <button
            key={t.id}
            ref={(element) => {
              tabRefs.current[t.id] = element;
            }}
            type="button"
            role="tab"
            id={`reports-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="reports-panel"
            tabIndex={tab === t.id ? 0 : -1}
            className={`${styles.tab} ${tab === t.id ? styles.tabSelected : ''}`}
            onClick={() => selectTab(t.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div id="reports-panel" role="tabpanel" aria-labelledby={`reports-tab-${tab}`}>
        {tab === 'monthly' && <MonthlyTab month={month} />}
        {tab === 'yearly' && <YearlyTab year={year} />}
        {tab === 'calendar' && <CalendarTab month={month} />}
      </div>
    </div>
  );
}
