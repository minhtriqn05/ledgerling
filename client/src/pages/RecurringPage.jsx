import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories.js';
import { getRecurringRules, toggleRecurringRule } from '../api/recurring.js';
import { getErrorMessage } from '../api/axios.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader/PageHeader.jsx';
import Button from '../components/Button/Button.jsx';
import Card from '../components/Card/Card.jsx';
import EmptyState from '../components/EmptyState/EmptyState.jsx';
import LoadingState from '../components/LoadingState/LoadingState.jsx';
import ErrorState from '../components/ErrorState/ErrorState.jsx';
import RuleRow from './recurring/RuleRow.jsx';
import RuleFormDialog from './recurring/RuleFormDialog.jsx';
import DeleteRuleDialog from './recurring/DeleteRuleDialog.jsx';
import { useLiveRefresh } from '../hooks/useLiveRefresh.js';
import styles from './RecurringPage.module.css';

// The user's weekly and monthly rules. A rule creates real transactions by itself when they are due.
export default function RecurringPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // "Try again" and saving a rule change this, which runs the effect again
  const [reloadKey, setReloadKey] = useState(0);
  // The open dialog: null, { form: rule } (rule = null for a new one) or { delete: rule }
  const [dialog, setDialog] = useState(null);
  // The id of the rule whose switch is waiting for the API
  const [togglingId, setTogglingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    Promise.all([getCategories(), getRecurringRules()])
      .then(([categoryList, ruleList]) => {
        if (cancelled) return;
        setCategories(categoryList);
        setRules(ruleList);
        setLoadError('');
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Another device changed something: the rows change in place, an open dialog stays open
  useLiveRefresh(['recurring', 'categories'], () => setReloadKey((key) => key + 1));

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  // Loads the list again: a rule that starts in the past has already created transactions, so its next run changed.
  function handleSaved() {
    toast.success(dialog.form ? t('recurring.updated') : t('recurring.added'));
    setDialog(null);
    reload();
  }

  function handleDeleted(rule) {
    toast.success(t('recurring.deleted'));
    setDialog(null);
    setRules((list) => list.filter((r) => r._id !== rule._id));
  }

  async function handleToggle(rule) {
    setTogglingId(rule._id);
    try {
      const saved = await toggleRecurringRule(rule._id);
      toast.success(saved.active ? t('recurring.turnedOn') : t('recurring.turnedOff'));
      setRules((list) => list.map((r) => (r._id === saved._id ? saved : r)));
      // A list that was still on its way (a live refresh) holds the old value: this drops that answer and asks again
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  const ready = !loading && !loadError;

  // The page shows one of four states: loading, error, empty or the list.
  function renderContent() {
    if (loading) return <LoadingState skeleton="rows">{t('recurring.loading')}</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={reload} />;

    if (rules.length === 0) {
      return (
        <EmptyState
          icon="repeat"
          title={t('recurring.emptyTitle')}
          text={t('recurring.emptyText')}
        >
          <Button needsNetwork icon="plus" onClick={() => setDialog({ form: null })}>
            {t('recurring.add')}
          </Button>
        </EmptyState>
      );
    }

    return (
      <Card>
        <ul className={styles.list}>
          {rules.map((rule, index) => (
            <RuleRow
              key={rule._id}
              index={index}
              rule={rule}
              toggling={togglingId === rule._id}
              onToggle={handleToggle}
              onEdit={(r) => setDialog({ form: r })}
              onDelete={(r) => setDialog({ delete: r })}
            />
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('nav.recurring')}
        subtitle={ready ? t('recurring.count', { count: rules.length }) : undefined}
      >
        <Button needsNetwork icon="plus" onClick={() => setDialog({ form: null })} disabled={!ready}>
          {t('recurring.add')}
        </Button>
      </PageHeader>

      {renderContent()}

      <AnimatePresence>
        {dialog && 'form' in dialog && (
          <RuleFormDialog key="form" rule={dialog.form} categories={categories} onSaved={handleSaved} onClose={() => setDialog(null)} />
        )}
        {dialog?.delete && (
          <DeleteRuleDialog key="delete" rule={dialog.delete} onDeleted={handleDeleted} onClose={() => setDialog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
