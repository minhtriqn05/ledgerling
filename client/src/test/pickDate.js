import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Picks a day in the DatePicker labelled `label`, like a user: open the calendar, go to the month with the
// arrows, click the day. day is "YYYY-MM-DD"; '' clicks "Clear" (optional dates).
export async function pickDate(label, day, user = userEvent) {
  await user.click(screen.getByLabelText(label));
  const calendar = await screen.findByRole('dialog', { name: 'Choose a date' });
  if (!day) {
    await user.click(within(calendar).getByRole('button', { name: 'Clear' }));
    return;
  }

  const month = day.slice(0, 7);
  const view = () => calendar.querySelector('[data-view]').dataset.view;
  for (let step = 0; step < 240 && view() !== month; step += 1) {
    await user.click(within(calendar).getByRole('button', { name: view() < month ? 'Next month' : 'Previous month' }));
  }
  await user.click(calendar.querySelector(`[data-month="${month}"] [data-day="${day}"]`));
}
