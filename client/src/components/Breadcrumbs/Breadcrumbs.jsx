import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildTrail } from '../../config/breadcrumbs.js';
import { useCurrentBreadcrumbDetail } from '../../context/BreadcrumbContext.jsx';
import Icon from '../Icon.jsx';
import styles from './Breadcrumbs.module.css';

// "Dashboard / Reports / Monthly": where the visitor is, and a link to every level above. The trail is made from the
// address and the route configuration (config/breadcrumbs.js), so no page writes its own.
// A screen reader gets a navigation landmark named "Breadcrumb", and the current level is marked aria-current="page".
// On a phone only the level above is shown, as "‹ Reports" (the same links, the others are hidden with CSS).
export default function Breadcrumbs() {
  // A component test may render a part of a page without a router: then there is no address to read
  if (!useInRouterContext()) return null;
  return <Trail />;
}

function Trail() {
  const { t } = useTranslation();
  const location = useLocation();
  const detail = useCurrentBreadcrumbDetail();
  const trail = buildTrail(location, detail);
  if (trail.length === 0) return null;

  return (
    <nav aria-label={t('breadcrumb.label')} className={styles.nav}>
      <ol className={styles.list}>
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          const label = t(item.labelKey);

          return (
            <li key={`${index}-${item.labelKey}`} className={styles.item}>
              {isLast ? (
                <span className={styles.current} aria-current="page">
                  {label}
                </span>
              ) : (
                <>
                  <span className={styles.backIcon} aria-hidden="true">
                    <Icon name="chevronLeft" size={16} />
                  </span>
                  <Link
                    to={item.to}
                    className={styles.link}
                    // Something is open on this page (the drawer): closing it is the way up, and the filters stay in the address
                    onClick={
                      item.onBack
                        ? (event) => {
                            event.preventDefault();
                            item.onBack();
                          }
                        : undefined
                    }
                  >
                    {label}
                  </Link>
                  <span className={styles.separator} aria-hidden="true">
                    <Icon name="chevronRight" size={14} />
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
