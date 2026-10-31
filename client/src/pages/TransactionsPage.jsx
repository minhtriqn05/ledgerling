import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories.js';
import { deleteTransaction, exportTransactions, getTransactions } from '../api/transactions.js';
import { getSummary } from '../api/stats.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import { UNDO_MS, useUndoDelete } from '../hooks/useUndoDelete.js';
import { categoryLabel } from '../utils/emoji.js';
import { formatDate, formatSignedVnd, formatVnd } from '../utils/format.js';
import { downloadFile } from '../utils/downloadFile.js';
import { currentMonth, formatMonth, fromDateInput, toDateInput } from '../utils/vnDate.js';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import MonthPicker from '../components/MonthPicker/MonthPicker.jsx';
import Card from '../components/Card/Card.jsx';
import Button from '../components/Button/Button.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import TransactionList from './transactions/TransactionList.jsx';
import TransactionFormDialog from './transactions/TransactionFormDialog.jsx';
import TransactionDrawer from './transactions/TransactionDrawer.jsx';
import BulkBar from './transactions/BulkBar.jsx';
import BulkDeleteDialog from './transactions/BulkDeleteDialog.jsx';
import BulkCategoryDialog from './transactions/BulkCategoryDialog.jsx';
import Pager from './transactions/Pager.jsx';
import ImportDialog from './transactions/ImportDialog.jsx';
import styles from './TransactionsPage.module.css';

// Design: TransactionsPreview in pages/styleGuide. Header with the month picker, three summary cards,
// then a card with the search box, the category filter, the list and the pager.
// Plans: docs/plans/transactions-page.md, then the search and paging change on feature/transactions-search.

// Wait this long after the last key before searching, so one request is sent per word and not per letter.
const SEARCH_DELAY_MS = 300;

// One of the three tinted cards (income / expense / net). tone: 'income' | 'expense' | 'net'.
function SummaryCard({ tone, icon, label, value }) {
  return (
    <div className={`${styles.summaryCard} ${styles[tone]}`}>
      <span className={styles.summaryTile}>
        <Icon name={icon} size={18} />
      </span>
      <div className={styles.summaryText}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

// The values the API accepts; the label is the translation key transactions.sort.<key>
const SORT_OPTIONS = [
  { value: '-date', key: 'newest' },
  { value: 'date', key: 'oldest' },
  { value: '-amount', key: 'highest' },
  { value: 'amount', key: 'lowest' },
];
const DEFAULT_SORT = '-date';

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;
const TAG_REGEX = /^[a-z0-9-]{1,20}$/;

// "2026-02-30" has the right shape but is not a real day (Date.UTC quietly turns it into March 2nd)
function isRealDay(text) {
  if (!DAY_REGEX.test(text ?? '')) return false;
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === text;
}

// Every filter lives in the URL (?month=2026-10&category=...&tag=work&q=coffee&sort=-amount&from=...&to=...&page=2),
// so F5 or a shared link shows the same list. A value that is missing or hand-edited into nonsense falls back to its
// default, so the API never gets a value it refuses (that would show an error screen instead of the list).
function readFilters(searchParams) {
  const month = searchParams.get('month');
  const category = searchParams.get('category');
  const tag = (searchParams.get('tag') ?? '').toLowerCase();
  const sort = searchParams.get('sort');
  let from = isRealDay(searchParams.get('from')) ? searchParams.get('from') : '';
  let to = isRealDay(searchParams.get('to')) ? searchParams.get('to') : '';
  // A range that ends before it starts is dropped
  if (from && to && from > to) {
    from = '';
    to = '';
  }
  const page = Number(searchParams.get('page'));
  return {
    month: MONTH_REGEX.test(month ?? '') ? month : currentMonth(),
    categoryId: OBJECT_ID_REGEX.test(category ?? '') ? category : 'all',
    tag: TAG_REGEX.test(tag) ? tag : '',
    q: (searchParams.get('q') ?? '').trim(),
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : DEFAULT_SORT,
    from,
    to,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

// Values that mean "no filter" are left out of the URL, so it stays short.
const URL_DEFAULTS = { category: 'all', sort: DEFAULT_SORT, page: '1' };

// Copies the current params and applies changes ({ key: value }; '' or null removes the key).
// The page goes back to 1 unless the change sets it: a new filter always starts at the first page.
function withChanges(current, changes) {
  const next = new URLSearchParams(current);
  if (!('page' in changes)) next.delete('page');
  Object.entries(changes).forEach(([key, value]) => {
    const text = value == null ? '' : String(value);
    if (text === '' || text === URL_DEFAULTS[key]) next.delete(key);
    else next.set(key, text);
  });
  return next;
}

// "12 Oct 2026 – 20 Oct 2026", "From 12 Oct 2026" or "Until 20 Oct 2026"
function formatRange(from, to, t) {
  const start = from && formatDate(fromDateInput(from));
  const end = to && formatDate(fromDateInput(to));
  if (start && end) return `${start} – ${end}`;
  return start ? t('transactions.fromDate', { date: start }) : t('transactions.untilDate', { date: end });
}

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { month, categoryId, tag, q, sort, from, to, page } = readFilters(searchParams);
  const hasRange = Boolean(from || to);
  // The filters as the API wants them, shared by the list and the CSV export.
  // A date range replaces the month (the API refuses both). useMemo keeps the same object until a filter changes.
  const apiFilters = useMemo(() => {
    const filters = { sort };
    if (from || to) {
      if (from) filters.from = from;
      if (to) filters.to = to;
    } else {
      filters.month = month;
    }
    if (categoryId !== 'all') filters.categoryId = categoryId;
    if (tag) filters.tag = tag;
    if (q) filters.q = q;
    return filters;
  }, [month, categoryId, tag, q, sort, from, to]);
  // What is typed in the search box. It reaches the URL (q) 300 ms after the last key.
  const [searchInput, setSearchInput] = useState(q);
  // The text the search box itself just put in the URL (null when none is on its way), see the two effects below
  const sentSearch = useRef(null);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState(null); // { page, limit, total, totalPages } of the loaded page
  const [summary, setSummary] = useState(null); // totals of the whole month from /stats/summary
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" and a save change these, which runs the matching effect again
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  // The open dialog: null, { kind: 'detail', transaction } (the drawer), { kind: 'form', transaction }
  // (transaction = null for a new one), { kind: 'import' }, { kind: 'bulk-delete' } or { kind: 'bulk-category' }
  const [dialog, setDialog] = useState(null);
  const [exporting, setExporting] = useState(false);
  // The ids of the ticked rows (bulk actions)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  // Delete with Undo: the row disappears at once, the API is called 5 seconds later unless Undo was clicked
  // (and at once when the page is left). See hooks/useUndoDelete.js.
  const undoDelete = useUndoDelete(deleteTransaction, {
    onDone: (id) => {
      // Take it out of the list now; the reload brings the page count, the totals and the rows that move up
      setTransactions((list) => list.filter((t) => t._id !== id));
      setReloadKey((key) => key + 1);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // The "/" key on another page lands here with a request to focus the search box
  useEffect(() => {
    if (!location.state?.focusSearch) return;
    searchRef.current?.focus();
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location, navigate]);

  // A ticked row that is no longer on the page (another page, filter or search, or it was deleted) is unticked
  useEffect(() => {
    setSelectedIds((current) => {
      const onPage = new Set(transactions.map((t) => t._id));
      const kept = [...current].filter((id) => onPage.has(id));
      return kept.length === current.size ? current : new Set(kept);
    });
  }, [transactions]);

  // The categories fill the filter and the form. They load once.
  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [categoriesKey]);

  // The search box: copy the text into the URL once the user stopped typing for a moment.
  // replace: true so every pause does not add an entry to the browser history.
  useEffect(() => {
    const timer = setTimeout(() => {
      const text = searchInput.trim();
      if (text === q) return;
      sentSearch.current = text;
      setSearchParams((current) => withChanges(current, { q: text }), { replace: true });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput, q, setSearchParams]);

  // The URL changed on its own (Clear filters, the Back button, a pasted link): show its search in the box.
  // When the new q is the one the box just sent, the box is left alone: the user may have typed another letter
  // while the URL was updating, and copying the older q back would erase that letter.
  useEffect(() => {
    const sentByTheBox = q === sentSearch.current;
    sentSearch.current = null;
    if (sentByTheBox) return;
    setSearchInput((current) => (current.trim() === q ? current : q));
  }, [q]);

  // The list reloads whenever any filter or the page changes. A date range replaces the month (the API refuses both).
  useEffect(() => {
    let cancelled = false;

    getTransactions({ ...apiFilters, page })
      .then(({ items, meta: nextMeta }) => {
        if (cancelled) return;
        // The page we asked for does not exist (its last row was deleted, or the link was edited): go to the last one.
        if (items.length === 0 && page > 1) {
          setSearchParams((current) => withChanges(current, { page: Math.max(nextMeta.totalPages, 1) }), { replace: true });
          return;
        }
        setTransactions(items);
        setMeta(nextMeta);
        setLoadError('');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getErrorMessage(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFilters, page, reloadKey, setSearchParams]);

  // The three cards show the whole month, so they come from the summary and not from the (one page) list.
  // If this request fails the cards are simply hidden; the list has its own error state.
  useEffect(() => {
    let cancelled = false;
    getSummary(month)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [month, reloadKey]);
  // (With a date range the cards are hidden, see showTotals, so the summary of the month is simply not shown.)

  // Shows "Loading…" again and clears an old error; filter changes call this first.
  // (Search and page changes keep the old rows on screen until the new ones arrive.)
  function startLoading() {
    setLoading(true);
    setLoadError('');
  }

  // Writes the changes to the URL (and so back to page 1, see withChanges). The effects above do the loading.
  function updateFilters(changes) {
    startLoading();
    setSearchParams((current) => withChanges(current, changes));
  }

  function changeMonth(nextMonth) {
    // Picking a month leaves the date range
    updateFilters({ month: nextMonth, from: '', to: '' });
  }

  // Keep From <= To: moving one past the other drags the other along.
  function changeFrom(event) {
    const value = event.target.value;
    updateFilters({ from: value, ...(value && to && value > to ? { to: value } : {}) });
  }

  function changeTo(event) {
    const value = event.target.value;
    updateFilters({ to: value, ...(value && from && value < from ? { from: value } : {}) });
  }

  function changePage(nextPage) {
    setSearchParams((current) => withChanges(current, { page: nextPage }));
  }

  function clearSearch() {
    setSearchInput('');
    setSearchParams((current) => withChanges(current, { q: '' }));
  }

  // The month stays: it is where you are, not a filter.
  const hasFilters = Boolean(
    q || searchInput.trim() || categoryId !== 'all' || tag || sort !== DEFAULT_SORT || hasRange
  );

  function clearFilters() {
    setSearchInput('');
    // Only the search box had text, not sent yet: the URL stays the same, so no reload would come
    // to end "Loading…". The list is already unfiltered, there is nothing more to do.
    if (!q && categoryId === 'all' && !tag && sort === DEFAULT_SORT && !hasRange) return;
    updateFilters({ q: '', category: '', tag: '', sort: '', from: '', to: '' });
  }

  // A click on a tag chip in the list (or the x on the "Tag" chip, with an empty tag)
  function filterByTag(nextTag) {
    updateFilters({ tag: nextTag });
  }

  // The import answered: show the new rows. The dialog stays open with the result until the user closes it.
  function handleImported() {
    startLoading();
    setReloadKey((key) => key + 1);
  }

  // Downloads every transaction that matches the current filters (not just this page; the server stops at 5000).
  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportTransactions(apiFilters);
      downloadFile(blob, filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  function retry() {
    startLoading();
    setCategoriesKey((key) => key + 1);
    setReloadKey((key) => key + 1);
  }

  // The form calls this with the transaction the API returned (new or updated).
  function handleSaved(saved) {
    toast.success(dialog.transaction ? t('transactions.updated') : t('transactions.added'));
    setDialog(null);
    // Follow the transaction: show its month (leaving any date range), in its category, and drop the search
    // (the note may not match it). The list goes back to page 1; the sort stays.
    const savedMonth = toDateInput(saved.date).slice(0, 7);
    setSearchInput('');
    updateFilters({
      month: savedMonth,
      from: '',
      to: '',
      q: '',
      category: categoryId !== 'all' && categoryId !== saved.category._id ? '' : categoryId,
      tag: tag && saved.tags?.includes(tag) ? tag : '',
    });
    setReloadKey((key) => key + 1);
  }

  // The trash button (and the Delete button of the edit dialog): no question, but a few seconds to Undo
  function handleDelete(transaction) {
    setDialog(null);
    undoDelete.remove(transaction._id);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(transaction._id);
      return next;
    });
    toast.success(t('transactions.deleted'), {
      duration: UNDO_MS,
      action: { label: t('transactions.undo'), onClick: () => undoDelete.undo(transaction._id) },
    });
  }

  function toggleRow(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // The "select all" box ticks every row shown on this page, or clears them
  function toggleAll(checked) {
    setSelectedIds(checked ? new Set(visibleTransactions.map((t) => t._id)) : new Set());
  }

  // A bulk action finished: unselect, close the dialog and load the list (and the totals) again
  function afterBulk(message) {
    toast.success(message);
    setDialog(null);
    setSelectedIds(new Set());
    startLoading();
    setReloadKey((key) => key + 1);
  }

  function handleBulkDeleted(count) {
    afterBulk(t('transactions.bulkDeleted', { count }));
  }

  function handleBulkCategory({ updated, category }) {
    afterBulk(
      updated === 0
        ? t('transactions.alreadyIn', { name: category.name })
        : t('transactions.bulkMoved', { count: updated, name: category.name })
    );
  }

  // Rows waiting for their Undo time are already gone from the screen (and from the counts)
  const visibleTransactions = transactions.filter((t) => !undoDelete.hiddenIds.has(t._id));
  const hiddenCount = transactions.length - visibleTransactions.length;

  const ready = !loading && !loadError;
  // The summary of another month (still loading) must not be shown under this month's name
  const showTotals = ready && !hasRange && summary?.month === month;
  const total = Math.max((meta?.total ?? 0) - hiddenCount, 0);

  // The card shows one of four states: loading, error, empty or the list.
  function renderContent() {
    if (loading) return <LoadingState skeleton="rows">{t('transactions.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={retry} />;

    if (visibleTransactions.length === 0) {
      if (q) {
        return (
          <EmptyState
            icon="search"
            title={t('transactions.noMatch', { q })}
            text={t('transactions.noMatchText')}
          >
            <Button variant="secondary" onClick={clearSearch}>
              {t('transactions.clearSearch')}
            </Button>
          </EmptyState>
        );
      }

      const filtered = categoryId !== 'all' || hasRange || Boolean(tag);
      return (
        <EmptyState
          icon="transactions"
          title={
            filtered
              ? t('transactions.noMatchFilters')
              : t('transactions.noneInMonth', { month: formatMonth(month) })
          }
          text={
            filtered
              ? t('transactions.noMatchFiltersText')
              : t('transactions.emptyText')
          }
        >
          <Button icon="plus" onClick={() => setDialog({ kind: 'form', transaction: null })}>
            {t('transactions.add')}
          </Button>
        </EmptyState>
      );
    }

    return (
      <>
        <TransactionList
          transactions={visibleTransactions}
          onOpen={(transaction) => setDialog({ kind: 'detail', transaction })}
          onEdit={(transaction) => setDialog({ kind: 'form', transaction })}
          onDelete={handleDelete}
          onTagClick={filterByTag}
          selectedIds={selectedIds}
          onToggle={toggleRow}
          onToggleAll={toggleAll}
        />
        <Pager meta={{ ...meta, total }} onPage={changePage} />
      </>
    );
  }

  const period = hasRange ? formatRange(from, to, t) : formatMonth(month);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('nav.transactions')}
        subtitle={ready ? `${period} · ${t('transactions.count', { count: total })}` : period}
      >
        <MonthPicker month={month} onChange={changeMonth} />
        <Button variant="secondary" icon="upload" onClick={() => setDialog({ kind: 'import' })} disabled={loading}>
          {t('import.title')}
        </Button>
        <Button variant="secondary" icon="download" onClick={handleExport} disabled={!ready || total === 0 || exporting}>
          {exporting ? t('transactions.exporting') : t('transactions.export')}
        </Button>
        <Button icon="plus" onClick={() => setDialog({ kind: 'form', transaction: null })} disabled={loading}>
          {t('transactions.add')}
        </Button>
      </PageHeader>

      {showTotals && (
        <section className={styles.summary} aria-label={t('common.totalsFor', { period: formatMonth(month) })}>
          <SummaryCard tone="income" icon="arrowDownLeft" label={t('common.income')} value={formatSignedVnd(summary.totalIncome, 'income')} />
          <SummaryCard tone="expense" icon="arrowUpRight" label={t('common.expense')} value={formatSignedVnd(summary.totalExpense, 'expense')} />
          <SummaryCard tone="net" icon="wallet" label={t('transactions.net')} value={formatVnd(summary.balance)} />
          <p className={styles.summaryNote}>
            {t('transactions.totalsNote', { month: formatMonth(month) })}
          </p>
        </section>
      )}

      <Card>
        <div className={styles.filters}>
          <span className={styles.search}>
            <Icon name="search" size={18} />
            <input
              ref={searchRef}
              data-hotkey-search
              className={styles.searchInput}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('transactions.searchNotes')}
              aria-label={t('transactions.searchNotes')}
              maxLength={100}
            />
          </span>
          <label className={styles.field}>
            <span className={styles.filterLabel}>{t('common.category')}</span>
            <select
              className={styles.select}
              value={categoryId}
              onChange={(event) => updateFilters({ category: event.target.value })}
            >
              <option value="all">{t('transactions.allCategories')}</option>
              <optgroup label={t('common.expense')}>
                {categories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {categoryLabel(c)}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={t('common.income')}>
                {categories
                  .filter((c) => c.type === 'income')
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {categoryLabel(c)}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.filterLabel}>{t('transactions.sortLabel')}</span>
            <select
              className={styles.select}
              value={sort}
              onChange={(event) => updateFilters({ sort: event.target.value })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(`transactions.sort.${option.key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.filterLabel}>{t('transactions.from')}</span>
            <input className={styles.select} type="date" value={from} max={to || undefined} onChange={changeFrom} />
          </label>
          <label className={styles.field}>
            <span className={styles.filterLabel}>{t('transactions.to')}</span>
            <input className={styles.select} type="date" value={to} min={from || undefined} onChange={changeTo} />
          </label>
          {tag && (
            <span className={styles.activeTag}>
              {t('transactions.tagFilter', { tag })}
              <button
                type="button"
                className={styles.activeTagRemove}
                aria-label={t('transactions.removeTagFilter', { tag })}
                onClick={() => filterByTag('')}
              >
                <Icon name="x" size={14} />
              </button>
            </span>
          )}
          {hasFilters && (
            <Button variant="secondary" onClick={clearFilters}>
              {t('transactions.clearFilters')}
            </Button>
          )}
        </div>
        {hasRange && (
          <p className={styles.rangeNote}>{t('transactions.rangeNote')}</p>
        )}

        {ready && selectedIds.size > 0 && (
          <BulkBar
            count={selectedIds.size}
            onChangeCategory={() => setDialog({ kind: 'bulk-category' })}
            onDelete={() => setDialog({ kind: 'bulk-delete' })}
            onClear={() => setSelectedIds(new Set())}
          />
        )}

        {renderContent()}
      </Card>

      <AnimatePresence>
        {dialog?.kind === 'detail' && (
          <TransactionDrawer
            key="detail"
            transaction={dialog.transaction}
            onEdit={(transaction) => setDialog({ kind: 'form', transaction })}
            onDelete={handleDelete}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.kind === 'form' && (
          <TransactionFormDialog
            key="form"
            transaction={dialog.transaction}
            categories={categories}
            onSaved={handleSaved}
            onClose={() => setDialog(null)}
            onDelete={handleDelete}
          />
        )}
        {dialog?.kind === 'import' && (
          <ImportDialog key="import" categories={categories} onImported={handleImported} onClose={() => setDialog(null)} />
        )}
        {dialog?.kind === 'bulk-delete' && (
          <BulkDeleteDialog key="bulk-delete" ids={[...selectedIds]} onDeleted={handleBulkDeleted} onClose={() => setDialog(null)} />
        )}
        {dialog?.kind === 'bulk-category' && (
          <BulkCategoryDialog
            key="bulk-category"
            ids={[...selectedIds]}
            categories={categories}
            onChanged={handleBulkCategory}
            onClose={() => setDialog(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
