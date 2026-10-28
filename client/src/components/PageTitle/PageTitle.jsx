import styles from './PageTitle.module.css';

// The page heading, shared by every page.
export default function PageTitle({ children }) {
  return <h1 className={styles.title}>{children}</h1>;
}
