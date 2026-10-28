import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

// Layout for the Login and Register pages: no sidebar, content centered on the page.
export default function AuthLayout() {
  return (
    <main className={styles.page}>
      <Outlet />
    </main>
  );
}
