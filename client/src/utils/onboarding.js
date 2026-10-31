// The "Get started" card of an empty Dashboard: three steps, each with a tick once it is done.
// key: the translation key under "onboarding.steps"; to: the page where the step is done.
const STEPS = [
  { key: 'transaction', to: '/transactions', doneWhen: ({ hasTransactions }) => hasTransactions },
  { key: 'budget', to: '/budgets', doneWhen: ({ budgetCount }) => budgetCount > 0 },
  { key: 'goal', to: '/goals', doneWhen: ({ goalCount }) => goalCount > 0 },
];

// progress: { hasTransactions, budgetCount, goalCount } -> [{ key, to, done }] in the order of the steps
export function getStartedSteps({ hasTransactions = false, budgetCount = 0, goalCount = 0 } = {}) {
  const progress = { hasTransactions, budgetCount, goalCount };
  return STEPS.map(({ key, to, doneWhen }) => ({ key, to, done: Boolean(doneWhen(progress)) }));
}
