import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import Aurora from '../Aurora/Aurora.jsx';
import Icon from '../Icon.jsx';
import Logo from '../Logo/Logo.jsx';
import PageTitle from '../PageTitle/PageTitle.jsx';
import styles from './PageHeader.module.css';

// Top of every signed-in page: the one dark, softly lit hero of the page, in both themes (data-tone="noir").
// icon: a name from components/Icon.jsx, shown in a large glass tile. logo: the spinning logo in its place.
// eyebrow: a small line above the title.
// The title and subtitle are on the left, the page's main actions (children) on the right.
// stats: the numbers the page leads with, in a row under the title.
// The title also becomes the text of the browser tab, unless documentTitle names a part of the page.
export default function PageHeader({ title, subtitle, eyebrow, icon, logo = false, stats, documentTitle, children }) {
  useDocumentTitle(documentTitle ?? title);

  return (
    <header className={styles.header} data-tone="noir">
      <Aurora />
      <div className={styles.top}>
        <div className={styles.heading}>
          {logo && <Logo size={64} showName={false} />}
          {icon && (
            <span className={styles.tile} aria-hidden="true">
              <Icon name={icon} size={26} />
            </span>
          )}
          <div className={styles.titles}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <PageTitle>{title}</PageTitle>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {children && <div className={styles.actions}>{children}</div>}
      </div>
      {stats && <div className={styles.stats}>{stats}</div>}
    </header>
  );
}
