import { useTranslation } from 'react-i18next';
import { getAdminStats } from '../api/admin.js';
import { useLoad } from '../hooks/useLoad.js';
import { formatNumber } from '../utils/format.js';
import { toChartData } from '../utils/admin.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Card, { CardHeader } from '../components/Card/Card.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import StatCard from './reports/StatCard.jsx';
import CountLineChart from './admin/AdminCharts.jsx';
import UsersTable from './admin/UsersTable.jsx';
import styles from './AdminPage.module.css';

// The Admin page (only an admin gets here, see AdminRoute): three number cards, two line charts of the last 30 days
// and the table of accounts. Plan: docs/plans/admin.md.
export default function AdminPage() {
  const { t } = useTranslation();
  const { data: stats, loading, error, reload } = useLoad(getAdminStats, []);

  function renderStats() {
    if (loading) return <LoadingState skeleton="cards" count={3}>{t('common.loading')}</LoadingState>;
    if (error) return <ErrorState message={error} onRetry={reload} />;

    return (
      <>
        <section className={styles.stats} aria-label={t('admin.stats.label')}>
          <StatCard tone="balance" icon="user" label={t('admin.stats.totalUsers')} value={formatNumber(stats.totalUsers)} />
          <StatCard tone="neutral" icon="chart" label={t('admin.stats.activeUsers')} value={formatNumber(stats.activeUsers7d)} />
          <StatCard tone="neutral" icon="transactions" label={t('admin.stats.totalTransactions')} value={formatNumber(stats.totalTransactions)} />
        </section>

        <div className={styles.charts}>
          <Card>
            <CardHeader icon="user" tone="mint" title={t('admin.charts.newUsers')} subtitle={t('admin.charts.last30')} />
            <CountLineChart
              data={toChartData(stats.newUsersPerDay)}
              name={t('admin.charts.newUsers')}
              color="--chart-3"
              ariaLabel={t('admin.charts.newUsersLabel')}
            />
          </Card>
          <Card>
            <CardHeader icon="transactions" tone="sky" title={t('admin.charts.transactions')} subtitle={t('admin.charts.last30')} />
            <CountLineChart
              data={toChartData(stats.transactionsPerDay)}
              name={t('admin.charts.transactions')}
              color="--chart-1"
              ariaLabel={t('admin.charts.transactionsLabel')}
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('nav.admin')} subtitle={t('admin.subtitle')} />
      {renderStats()}
      <UsersTable />
    </div>
  );
}
