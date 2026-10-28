import PageTitle from '../PageTitle/PageTitle.jsx';
import styles from './PageHeader.module.css';

// Top of every signed-in page: title and subtitle on the left, the page's main actions (children) on the right.
export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className={styles.header}>
      <div>
        <PageTitle>{title}</PageTitle>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
