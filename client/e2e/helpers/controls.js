import { expect } from '@playwright/test';

// Helpers for the form controls Ledgerling draws itself (components/Select and components/DatePicker).
// They are used like a person would: open, then click.

// Opens a Select (a combobox) and clicks the option with this visible name.
export async function chooseOption(combobox, name) {
  await combobox.click();
  await combobox.page().getByRole('option', { name, exact: true }).click();
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
}

// Picks a day ("YYYY-MM-DD") in the DatePicker labelled `label` inside `scope` (a page or a dialog locator):
// opens the calendar, goes to the right month with the arrows and clicks the day.
export async function pickDate(scope, label, day) {
  const page = 'page' in scope && typeof scope.page === 'function' ? scope.page() : scope;
  await scope.getByLabel(label, { exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose a date' });
  const month = day.slice(0, 7);

  for (let step = 0; step < 240; step += 1) {
    const view = await calendar.locator('[data-view]').getAttribute('data-view');
    if (view === month) break;
    await calendar.getByRole('button', { name: view < month ? 'Next month' : 'Previous month' }).click();
  }
  await calendar.locator(`[data-month="${month}"] [data-day="${day}"]`).click();
  await expect(calendar).toBeHidden();
}

// The DatePicker field labelled `label`; its data-value attribute holds the day ("YYYY-MM-DD", '' when empty)
export function dateField(scope, label) {
  return scope.getByLabel(label, { exact: true });
}
