import { useTranslation } from 'react-i18next';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <h1>Ledgerling</h1>
      <p>{t('auth.pitchLead')}</p>
    </main>
  );
}
