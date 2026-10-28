import Icon from './icons.jsx';
import { user, summary } from './sampleData.js';
import { formatCompact } from '../../utils/format.js';
import ui from './ui.module.css';
import styles from './PreviewShell.module.css';

// The app frame shared by every signed-in screen (sidebar + page content),
// plus small pieces that every page header uses.

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions' },
  { id: 'categories', label: 'Categories', icon: 'categories' },
];

// Circle that fills up to `percent` (e.g. share of income saved).
function ProgressRing({ percent }) {
  const radius = 22;
  const length = 2 * Math.PI * radius;
  return (
    <svg className={styles.ring} width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle className={styles.ringTrack} cx="28" cy="28" r={radius} />
      <circle
        className={styles.ringValue}
        cx="28"
        cy="28"
        r={radius}
        strokeDasharray={`${(percent / 100) * length} ${length}`}
        transform="rotate(-90 28 28)"
      />
      <text className={styles.ringText} x="28" y="32" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  );
}

export default function PreviewShell({ active, children }) {
  const saved = summary.income - summary.expense;
  const savedShare = Math.round((saved / summary.income) * 100);

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>L</span>
          Ledgerling
        </div>

        <nav className={styles.nav} aria-label="Preview navigation">
          {navItems.map((item) => (
            <span key={item.id} className={`${styles.navItem} ${item.id === active ? styles.navActive : ''}`}>
              <Icon name={item.icon} />
              {item.label}
            </span>
          ))}
        </nav>

        <div className={styles.savings}>
          <ProgressRing percent={savedShare} />
          <div className={styles.savingsText}>
            <span>Saved in October</span>
            <strong>{formatCompact(saved)}&nbsp;₫</strong>
            <span>of your income</span>
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.user}>
            <span className={styles.userAvatar}>{user.initials}</span>
            <span className={styles.userText}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </span>
          </div>
          <span className={styles.navItem}>
            <Icon name="logout" />
            Log out
          </span>
        </div>
      </aside>

      <div className={styles.main}>
        {/* On phones the sidebar is hidden; a slim app bar takes its place. */}
        <div className={styles.mobileBar}>
          <span className={styles.brand}>
            <span className={styles.logo}>L</span>
            Ledgerling
          </span>
          <span className={styles.userAvatar}>{user.initials}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// Page title on the left, actions on the right.
export function Topbar({ title, subtitle, children }) {
  return (
    <header className={styles.topbar}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.actions}>{children}</div>
    </header>
  );
}

export function MonthPicker() {
  return (
    <div className={styles.monthPicker}>
      <button type="button" className={styles.pickerButton} aria-label="Previous month">
        <Icon name="chevronLeft" size={18} />
      </button>
      <span>October 2026</span>
      <button type="button" className={styles.pickerButton} aria-label="Next month">
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}

export function AddButton({ label = 'Add transaction' }) {
  return (
    <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnWithIcon}`}>
      <Icon name="plus" size={18} />
      {label}
    </button>
  );
}

// Card header: colored icon tile + title + subtitle, optional content on the right.
export function CardHeader({ icon, tone, title, subtitle, children }) {
  return (
    <div className={ui.cardHeader}>
      <div className={ui.cardHeading}>
        <span className={`${ui.tile} ${tone}`}>
          <Icon name={icon} size={18} />
        </span>
        <div>
          <h4 className={ui.cardTitle}>{title}</h4>
          <p className={ui.cardSub}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
