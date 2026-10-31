import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTransactions } from '../../api/transactions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useThemeChoice } from '../../hooks/useThemeChoice.js';
import { LANGUAGES } from '../../i18n/languages.js';
import { filterCommands, pageCommands, transactionPath } from '../../utils/commands.js';
import { formatDate, formatSignedVnd } from '../../utils/format.js';
import Icon from '../Icon.jsx';
import Modal from '../Modal/Modal.jsx';
import styles from './CommandPalette.module.css';

// Wait this long after the last key before asking the API, so one request is sent per word and not per letter
const SEARCH_DELAY_MS = 250;
const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 5;
// "All time" for the search: the API looks at the current month without a date
const SEARCH_FROM = '2000-01-01';

// The transactions whose note holds the text: { items, loading, failed }
function useTransactionSearch(query) {
  const wanted = query.trim();
  const [state, setState] = useState({ wanted: '', items: [], failed: false });
  const enabled = wanted.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      getTransactions({ q: wanted, from: SEARCH_FROM, limit: MAX_RESULTS })
        .then(({ items }) => {
          if (!cancelled) setState({ wanted, items, failed: false });
        })
        .catch(() => {
          if (!cancelled) setState({ wanted, items: [], failed: true });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wanted, enabled]);

  if (!enabled) return { items: [], loading: false, failed: false };
  // An answer for an older text is not shown
  if (state.wanted !== wanted) return { items: [], loading: true, failed: false };
  return { items: state.items, loading: false, failed: state.failed };
}

// Ctrl+K (Cmd+K on a Mac): type to jump to a page, find a transaction by its note or run a command.
// The focus stays in the text box while the arrows move a highlight through the list (aria-activedescendant).
// "Change language" turns the list into the languages; Escape goes back from there, or closes.
export default function CommandPalette({ onClose, onQuickAdd }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggle } = useThemeChoice();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('all'); // 'all' or 'language'
  const [active, setActive] = useState(0);
  const search = useTransactionSearch(mode === 'all' ? query : '');

  const commands = useMemo(() => {
    if (mode === 'language') {
      return LANGUAGES.map((language) => ({
        id: `language:${language.code}`,
        group: 'languages',
        icon: 'globe',
        label: language.name,
        lang: language.code,
        hint: language.short,
        checked: language.code === i18n.resolvedLanguage,
        run: () => i18n.changeLanguage(language.code),
      }));
    }
    const actions = [
      { id: 'action:add', group: 'actions', icon: 'plus', label: t('transactions.add'), run: onQuickAdd },
      { id: 'action:theme', group: 'actions', icon: 'moon', label: t('commandPalette.toggleTheme'), run: toggle },
      { id: 'action:language', group: 'actions', icon: 'globe', label: t('commandPalette.changeLanguage'), keepOpen: true },
    ];
    const pages = pageCommands(user, t).map((command) => ({ ...command, run: () => navigate(command.path) }));
    return [...pages, ...actions];
    // The language is in the dependencies through `t`
  }, [mode, user, t, i18n, navigate, onQuickAdd, toggle]);

  const results = search.items.map((transaction) => ({
    id: `transaction:${transaction._id}`,
    group: 'transactions',
    icon: 'transactions',
    label: transaction.note || transaction.category.name,
    detail: `${formatDate(transaction.date)} · ${formatSignedVnd(transaction.amount, transaction.type)}`,
    run: () => navigate(transactionPath(transaction)),
  }));
  const items = [...filterCommands(commands, query), ...results];
  const safeActive = Math.min(active, Math.max(items.length - 1, 0));

  const optionId = (index) => `${listId}-${index}`;

  // The highlighted row stays in view when the list scrolls (jsdom has no scrollIntoView)
  useEffect(() => {
    document.getElementById(`${listId}-${safeActive}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [safeActive, listId]);

  function changeQuery(next) {
    setQuery(next);
    setActive(0);
  }

  function runCommand(command) {
    if (command.id === 'action:language') {
      setMode('language');
      changeQuery('');
      return;
    }
    onClose();
    command.run?.();
  }

  function handleKeyDown(event) {
    const last = items.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(safeActive >= last ? 0 : safeActive + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(safeActive <= 0 ? last : safeActive - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (items[safeActive]) runCommand(items[safeActive]);
    } else if (event.key === 'Escape' && mode === 'language') {
      // preventDefault keeps the dialog open: only the list of languages closes
      event.preventDefault();
      setMode('all');
      changeQuery('');
    }
  }

  // The rows grouped for display, each with its index in the flat list
  const groups = [];
  items.forEach((command, index) => {
    const current = groups[groups.length - 1];
    if (current?.name === command.group) current.rows.push({ command, index });
    else groups.push({ name: command.group, rows: [{ command, index }] });
  });

  return (
    <Modal title={t('commandPalette.title')} onClose={onClose}>
      <div className={styles.searchBox}>
        <Icon name="search" size={18} />
        <input
          className={styles.input}
          type="text"
          role="combobox"
          name="command-search"
          autoComplete="off"
          spellCheck={false}
          aria-label={t('commandPalette.placeholder')}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={items.length > 0 ? optionId(safeActive) : undefined}
          placeholder={mode === 'language' ? t('commandPalette.searchLanguage') : t('commandPalette.placeholder')}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          data-autofocus
          data-testid="command-input"
        />
      </div>

      <ul id={listId} role="listbox" aria-label={t('commandPalette.results')} className={styles.list}>
        {groups.map((group) => (
          <li key={group.name} role="presentation">
            <div id={`${listId}-${group.name}`} className={styles.groupLabel}>
              {t(`commandPalette.groups.${group.name}`)}
            </div>
            <ul role="group" aria-labelledby={`${listId}-${group.name}`} className={styles.groupList}>
              {group.rows.map(({ command, index }) => (
                <li
                  key={command.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === safeActive}
                  lang={command.lang}
                  className={`${styles.option} ${index === safeActive ? styles.active : ''}`}
                  onPointerMove={() => index !== safeActive && setActive(index)}
                  onClick={() => runCommand(command)}
                >
                  <Icon name={command.icon} size={18} />
                  <span className={styles.label}>{command.label}</span>
                  {command.detail && <span className={styles.detail}>{command.detail}</span>}
                  {command.hint && (
                    <span className={styles.detail} aria-hidden="true" lang="en">
                      {command.hint}
                    </span>
                  )}
                  {command.checked && <Icon name="check" size={16} />}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className={styles.status} role="status">
        {search.loading && t('commandPalette.searching')}
        {search.failed && t('commandPalette.searchFailed')}
        {!search.loading && !search.failed && items.length === 0 && t('commandPalette.noResults')}
      </p>
    </Modal>
  );
}
