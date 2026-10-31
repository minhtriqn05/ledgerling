import { describe, expect, it } from 'vitest';
import { getStartedSteps } from './onboarding.js';

const doneOf = (steps) => steps.map((step) => step.done);

describe('getStartedSteps', () => {
  it('has the three steps in order, each with the page where it is done', () => {
    const steps = getStartedSteps();
    expect(steps.map((step) => step.key)).toEqual(['transaction', 'budget', 'goal']);
    expect(steps.map((step) => step.to)).toEqual(['/transactions', '/budgets', '/goals']);
  });

  it('ticks nothing for a brand new account', () => {
    expect(doneOf(getStartedSteps())).toEqual([false, false, false]);
    expect(doneOf(getStartedSteps({ hasTransactions: false, budgetCount: 0, goalCount: 0 }))).toEqual([false, false, false]);
  });

  it('ticks a step as soon as its thing exists', () => {
    expect(doneOf(getStartedSteps({ hasTransactions: true }))).toEqual([true, false, false]);
    expect(doneOf(getStartedSteps({ budgetCount: 2 }))).toEqual([false, true, false]);
    expect(doneOf(getStartedSteps({ goalCount: 1 }))).toEqual([false, false, true]);
  });

  it('ticks all three when everything is set up', () => {
    expect(doneOf(getStartedSteps({ hasTransactions: true, budgetCount: 1, goalCount: 1 }))).toEqual([true, true, true]);
  });
});
