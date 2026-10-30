import { useEffect, useState } from 'react';
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
import styles from './RecurringPage.module.css';

// The user's weekly and monthly rules. A rule creates real transactions by itself when they are due.
export default function RecurringPage() {
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

  function reload() {
    setLoading(true);
    setLoadError('');
    setReloadKey((key) => key + 1);
  }

  // Loads the list again: a rule that starts in the past has already created transactions, so its next run changed.
  function handleSaved() {
    toast.success(dialog.form ? 'Rule updated' : 'Rule added');
    setDialog(null);
    reload();
  }

  function handleDeleted(rule) {
    toast.success('Rule deleted');
    setDialog(null);
    setRules((list) => list.filter((r) => r._id !== rule._id));
  }

  async function handleToggle(rule) {
    setTogglingId(rule._id);
    try {
      const saved = await toggleRecurringRule(rule._id);
      toast.success(saved.active ? 'Rule turned on' : 'Rule turned off');
      setRules((list) => list.map((r) => (r._id === saved._id ? saved : r)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  const ready = !loading && !loadError;

  // The page shows one of four states: loading, error, empty or the list.
  function renderContent() {
    if (loading) return <LoadingState>Loading rules…</LoadingState>;
    if (loadError) return <ErrorState message={loadError} onRetry={reload} />;

    if (rules.length === 0) {
      return (
        <EmptyState
          icon="repeat"
          title="No recurring rules yet"
          text="Add your rent, salary or subscriptions once, and their transactions are created for you when they are due."
        >
          <Button icon="plus" onClick={() => setDialog({ form: null })}>
            Add rule
          </Button>
        </EmptyState>
      );
    }

    return (
      <Card>
        <ul className={styles.list}>
          {rules.map((rule) => (
            <RuleRow
              key={rule._id}
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
        title="Recurring"
        subtitle={ready ? `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'}` : undefined}
      >
        <Button icon="plus" onClick={() => setDialog({ form: null })} disabled={!ready}>
          Add rule
        </Button>
      </PageHeader>

      {renderContent()}

      {dialog && 'form' in dialog && (
        <RuleFormDialog rule={dialog.form} categories={categories} onSaved={handleSaved} onClose={() => setDialog(null)} />
      )}
      {dialog?.delete && (
        <DeleteRuleDialog rule={dialog.delete} onDeleted={handleDeleted} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
