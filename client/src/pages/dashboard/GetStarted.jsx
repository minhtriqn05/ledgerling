import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBudgets } from '../../api/budgets.js';
import { getGoals } from '../../api/goals.js';
import { useLiveRefresh } from '../../hooks/useLiveRefresh.js';
import { getStartedSteps } from '../../utils/onboarding.js';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import Icon from '../../components/Icon.jsx';
import styles from './GetStarted.module.css';

// "Get started" card of an empty Dashboard: three steps (first transaction, a budget, a savings goal) with a tick
// once each one is done. Like the other dashboard cards it loads its own data: a failed request just leaves the
// step unticked, it never breaks the page. Each step links to the page where it is done.
// hasTransactions: the Dashboard already knows whether there are transactions.
export default function GetStarted({ hasTransactions = false }) {
  const { t } = useTranslation();
  // null while loading
  const [counts, setCounts] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  useLiveRefresh(['budgets', 'goals'], () => setReloadKey((key) => key + 1));

  useEffect(() => {
    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    Promise.allSettled([getBudgets(), getGoals()]).then(([budgets, goals]) => {
      if (cancelled) return;
      setCounts({
        budgetCount: budgets.status === 'fulfilled' ? budgets.value.length : 0,
        goalCount: goals.status === 'fulfilled' ? goals.value.length : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const steps = getStartedSteps({ hasTransactions, ...counts });
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card data-testid="get-started">
      <CardHeader icon="sprout" tone="mint" title={t('onboarding.title')} subtitle={t('onboarding.subtitle')}>
        <span className={styles.progress}>{t('onboarding.progress', { done: doneCount, total: steps.length })}</span>
      </CardHeader>

      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.key} className={step.done ? `${styles.step} ${styles.done}` : styles.step} data-done={step.done}>
            <span className={styles.mark} aria-hidden="true">
              {step.done ? <Icon name="check" size={16} /> : index + 1}
            </span>
            <div className={styles.text}>
              <Link to={step.to} className={styles.link}>
                {t(`onboarding.steps.${step.key}.title`)}
              </Link>
              <p>{t(`onboarding.steps.${step.key}.text`)}</p>
            </div>
            <span className={styles.state}>{step.done ? t('onboarding.done') : t('onboarding.todo')}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
