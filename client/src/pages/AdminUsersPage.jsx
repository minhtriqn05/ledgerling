import { useTranslation } from 'react-i18next';
import BackButton from '../components/BackButton/BackButton.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import UsersTable from './admin/UsersTable.jsx';
import styles from './AdminPage.module.css';

// Admin / Users: the table of accounts, one level below the numbers of the Admin page.
export default function AdminUsersPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <BackButton to="/admin" />
      <PageHeader title={t('admin.users.title')} subtitle={t('admin.users.pageText')} />
      <UsersTable />
    </div>
  );
}
