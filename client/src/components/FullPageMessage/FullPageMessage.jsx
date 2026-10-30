import EmptyState from '../EmptyState/EmptyState.jsx';
import styles from './FullPageMessage.module.css';

// A whole-screen message in the middle of the page, without the sidebar. Used by the 404 page and the error screen.
// `code` is an optional big label above the card (e.g. "404"); the button goes in as children.
// It must not use the router or any context, because the error screen is shown outside of them.
export default function FullPageMessage({ code, icon, title, text, children }) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        {code && <p className={styles.code}>{code}</p>}
        <EmptyState icon={icon} title={title} text={text}>
          {children}
        </EmptyState>
      </div>
    </main>
  );
}
