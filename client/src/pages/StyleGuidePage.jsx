import { useState } from 'react';
import DashboardPreview from './styleGuide/DashboardPreview.jsx';
import TransactionsPreview from './styleGuide/TransactionsPreview.jsx';
import CategoriesPreview from './styleGuide/CategoriesPreview.jsx';
import LoginPreview from './styleGuide/LoginPreview.jsx';
import ComponentsPreview from './styleGuide/ComponentsPreview.jsx';
import styles from './StyleGuidePage.module.css';

// Temporary page (dev only) to review the design by eye.
// Each tab shows a static mock of one screen with sample data, or the component catalog.

const tabs = [
  { id: 'dashboard', label: 'Dashboard', Preview: DashboardPreview },
  { id: 'transactions', label: 'Transactions', Preview: TransactionsPreview },
  { id: 'categories', label: 'Categories', Preview: CategoriesPreview },
  { id: 'login', label: 'Login', Preview: LoginPreview },
  { id: 'components', label: 'Components', Preview: ComponentsPreview },
];

// The tab is kept in the URL hash (/style-guide#transactions) so a screen can be linked directly.
function tabFromHash() {
  const id = window.location.hash.slice(1);
  return tabs.some((tab) => tab.id === id) ? id : 'dashboard';
}

export default function StyleGuidePage() {
  const [activeId, setActiveId] = useState(tabFromHash);
  const active = tabs.find((tab) => tab.id === activeId);

  function selectTab(id) {
    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Dev only · not part of the app</p>
        <h1>Ledgerling style guide</h1>
        <p className={styles.lead}>
          Static mocks with sample data that show how every screen will look. All values come from{' '}
          <code>src/styles/tokens.css</code>.
        </p>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Screens">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            className={`${styles.tab} ${tab.id === activeId ? styles.tabActive : ''}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <active.Preview />
    </main>
  );
}
