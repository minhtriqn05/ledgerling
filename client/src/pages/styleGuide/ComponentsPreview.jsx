import Icon from './icons.jsx';
import { categories } from './sampleData.js';
import { cssVar } from '../../utils/cssVar.js';
import { formatNumber } from '../../utils/format.js';
import ui from './ui.module.css';
import styles from './ComponentsPreview.module.css';

// Every token and base component in one place.

const colorGroups = [
  {
    title: 'Brand',
    tokens: ['--color-primary', '--color-primary-hover', '--color-primary-soft', '--color-hero-from', '--color-hero-to'],
  },
  {
    title: 'Surfaces & borders',
    tokens: ['--color-bg', '--color-surface', '--color-surface-muted', '--color-border', '--color-border-strong'],
  },
  {
    title: 'Text',
    tokens: ['--color-text', '--color-text-secondary', '--color-text-muted'],
  },
  {
    title: 'Income / expense',
    tokens: [
      '--color-income',
      '--color-income-text',
      '--color-income-soft',
      '--color-expense',
      '--color-expense-text',
      '--color-expense-soft',
    ],
  },
  {
    title: 'Accents',
    tokens: ['--accent-sky', '--accent-coral', '--accent-teal', '--accent-sun', '--accent-periwinkle', '--accent-mint'],
  },
  {
    title: 'Category colors (fixed order)',
    tokens: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7', '--chart-8'],
  },
  {
    title: 'Chart helpers',
    tokens: ['--chart-bar', '--chart-bar-track', '--chart-highlight', '--chart-grid'],
  },
];

const gradients = [
  { token: '--gradient-hero', label: 'Hero', use: 'One card per screen, logo, login panel. White text.' },
  { token: '--gradient-soft', label: 'Soft', use: 'Savings card, empty states.' },
  { token: '--gradient-page-top', label: 'Page top', use: 'Light sky band behind the page header.' },
];

const tones = [
  { tone: ui.toneSky, icon: 'chart', label: 'Sky' },
  { tone: ui.toneSun, icon: 'pie', label: 'Sun' },
  { tone: ui.toneMint, icon: 'calendar', label: 'Mint' },
  { tone: ui.tonePeriwinkle, icon: 'receipt', label: 'Periwinkle' },
  { tone: ui.toneCoral, icon: 'arrowUpRight', label: 'Coral' },
  { tone: ui.toneTeal, icon: 'wallet', label: 'Teal' },
];

export default function ComponentsPreview() {
  return (
    <div className={styles.sections}>
      <section>
        <h2 className={styles.heading}>Colors</h2>
        <div className={styles.colorGrid}>
          {colorGroups.map((group) => (
            <div key={group.title} className={ui.card}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <ul className={styles.swatchList}>
                {group.tokens.map((token) => (
                  <li key={token} className={styles.swatch}>
                    <span className={styles.swatchColor} style={{ background: `var(${token})` }} />
                    <code>{token}</code>
                    <span className={styles.swatchValue}>{cssVar(token)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Gradients & accent tiles</h2>
        <div className={styles.gradientGrid}>
          {gradients.map((g) => (
            <div key={g.token} className={ui.card}>
              <span className={styles.gradientSample} style={{ background: `var(${g.token})` }} />
              <strong>{g.label}</strong>
              <code>{g.token}</code>
              <span className={styles.gradientUse}>{g.use}</span>
            </div>
          ))}
        </div>
        <div className={`${ui.card} ${styles.tileRow}`}>
          {tones.map((t) => (
            <span key={t.label} className={styles.tileSample}>
              <span className={`${ui.tile} ${t.tone}`}>
                <Icon name={t.icon} size={18} />
              </span>
              {t.label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Typography</h2>
        <div className={`${ui.card} ${styles.typeSample}`}>
          <p className={styles.type3xl}>
            {formatNumber(12450000)}
            <span className={ui.unit}>₫</span>
          </p>
          <p className={styles.typeXl}>Page title – Transactions</p>
          <p className={styles.typeLg}>Section title – This month</p>
          <p className={styles.typeMd}>Card title – Spending by category</p>
          <p>Body text (14px). The quick brown fox jumps over the lazy dog.</p>
          <p className={styles.typeXs}>Caption / table header (12px)</p>
          <p>Vietnamese check: Ăn trưa, Tiền điện, Lương tháng 10</p>
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Buttons & inputs</h2>
        <div className={`${ui.card} ${styles.stack}`}>
          <div className={styles.row}>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnWithIcon}`}>
              <Icon name="plus" size={18} />
              Add transaction
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnSecondary}`}>
              Cancel
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`}>
              View all
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnDanger}`}>
              Delete
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled>
              Disabled
            </button>
            <button type="button" className={ui.iconBtn} aria-label="Edit">
              <Icon name="edit" size={18} />
            </button>
            <button type="button" className={`${ui.iconBtn} ${ui.iconBtnDanger}`} aria-label="Delete">
              <Icon name="trash" size={18} />
            </button>
          </div>

          <div className={styles.formGrid}>
            <label className={ui.field}>
              <span className={ui.label}>Search</span>
              <span className={ui.inputWrap}>
                <Icon name="search" size={18} />
                <input className={ui.input} placeholder="Search notes" />
              </span>
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Category</span>
              <select className={ui.input} defaultValue="food">
                <option value="food">Food</option>
                <option value="transport">Transport</option>
              </select>
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Date</span>
              <input className={ui.input} type="date" defaultValue="2026-10-27" />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Email</span>
              <input className={`${ui.input} ${ui.inputError}`} defaultValue="not-an-email" />
              <span className={ui.errorText}>Please enter a valid email.</span>
            </label>
          </div>

          <div className={styles.row}>
            <div className={ui.segmented}>
              <button type="button" className={`${ui.segment} ${ui.segmentActive}`}>
                All
              </button>
              <button type="button" className={ui.segment}>
                Income
              </button>
              <button type="button" className={ui.segment}>
                Expense
              </button>
            </div>
            <div className={ui.segmented}>
              <button type="button" className={`${ui.segment} ${ui.segmentExpense}`}>
                Expense
              </button>
              <button type="button" className={ui.segment}>
                Income
              </button>
            </div>
            <span className={`${ui.badge} ${ui.badgeIncome}`}>Income</span>
            <span className={`${ui.badge} ${ui.badgeExpense}`}>Expense</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Categories</h2>
        <div className={`${ui.card} ${styles.stack}`}>
          <div className={styles.row}>
            {categories.map((c) => (
              <span key={c.id} className={ui.chip} style={{ '--tone': `var(${c.color})` }}>
                <i className={ui.dot} />
                {c.name}
              </span>
            ))}
          </div>
          <div className={styles.row}>
            {categories.map((c) => (
              <span key={c.id} className={ui.avatar} style={{ '--tone': `var(${c.color})` }}>
                {c.name[0]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Feedback</h2>
        <div className={styles.feedbackGrid}>
          <div className={styles.stack}>
            <div className={`${ui.alert} ${ui.alertInfo}`}>
              <Icon name="info" size={18} />
              <span>Months follow Vietnam time (UTC+7).</span>
            </div>
            <div className={`${ui.alert} ${ui.alertSuccess}`} role="status">
              <Icon name="check" size={18} />
              <span>
                <strong>Transaction added.</strong> Your October summary is up to date.
              </span>
            </div>
            <div className={`${ui.alert} ${ui.alertError}`} role="alert">
              <Icon name="alert" size={18} />
              <span>
                <strong>Email or password is incorrect.</strong> Please try again.
              </span>
            </div>
          </div>

          <div className={`${ui.card} ${styles.empty}`}>
            <div className={styles.emptyArt} aria-hidden="true">
              <span className={`${styles.blob} ${styles.blobSky}`} />
              <span className={`${styles.blob} ${styles.blobMint}`} />
              <span className={`${styles.blob} ${styles.blobSun}`} />
              <span className={styles.emptyIcon}>
                <Icon name="receipt" size={26} />
              </span>
            </div>
            <h4 className={ui.cardTitle}>No transactions yet</h4>
            <p className={styles.emptyText}>Add your first income or expense to see your month take shape.</p>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnWithIcon}`}>
              <Icon name="plus" size={18} />
              Add transaction
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
