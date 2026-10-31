import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from './DatePicker.jsx';

function Field({ initial = '', onChange = () => {}, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="day">Day</label>
      <DatePicker
        id="day"
        value={value}
        onChange={(day) => {
          setValue(day);
          onChange(day);
        }}
        {...props}
      />
    </>
  );
}

const calendar = () => screen.getByRole('dialog', { name: 'Choose a date' });
const dayButton = (day) => calendar().querySelector(`[data-month="${day.slice(0, 7)}"] [data-day="${day}"]`);

describe('DatePicker', () => {
  it('shows the chosen day in the user language, or a placeholder', () => {
    const { unmount } = render(<Field initial="2026-10-25" />);
    expect(screen.getByLabelText('Day')).toHaveTextContent('25 Oct 2026');
    expect(screen.getByLabelText('Day')).toHaveValue('2026-10-25');
    unmount();

    render(<Field />);
    expect(screen.getByLabelText('Day')).toHaveTextContent('Pick a date');
  });

  it('opens on the month of the value, with that day marked and focused', async () => {
    render(<Field initial="2026-08-14" />);
    await userEvent.click(screen.getByLabelText('Day'));

    expect(within(calendar()).getByText('August 2026')).toBeInTheDocument();
    expect(dayButton('2026-08-14')).toHaveAttribute('aria-pressed', 'true');
    expect(dayButton('2026-08-14')).toHaveFocus();
    expect(dayButton('2026-08-14')).toHaveAccessibleName('14 August 2026');
  });

  it('picks a day with a click, closes and gives the focus back', async () => {
    const onChange = vi.fn();
    render(<Field initial="2026-08-14" onChange={onChange} />);
    const field = screen.getByLabelText('Day');

    await userEvent.click(field);
    await userEvent.click(within(calendar()).getByRole('button', { name: 'Next month' }));
    expect(within(calendar()).getByText('September 2026')).toBeInTheDocument();
    await userEvent.click(dayButton('2026-09-03'));

    expect(onChange).toHaveBeenCalledWith('2026-09-03');
    expect(field).toHaveValue('2026-09-03');
    expect(field).toHaveAttribute('aria-expanded', 'false');
    expect(field).toHaveFocus();
  });

  it('moves with the keyboard and picks with Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field initial="2026-10-30" onChange={onChange} />);

    await user.click(screen.getByLabelText('Day'));
    await user.keyboard('{ArrowRight}'); // 31 Oct
    await user.keyboard('{ArrowRight}'); // 1 Nov: the month changes
    expect(within(calendar()).getByText('November 2026')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}'); // 8 Nov
    expect(dayButton('2026-11-08')).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('2026-11-08');
  });

  it('closes with Escape without changing the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field initial="2026-10-30" onChange={onChange} />);

    await user.click(screen.getByLabelText('Day'));
    await user.keyboard('{ArrowLeft}{Escape}');

    expect(screen.getByLabelText('Day')).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cannot pick a day outside min and max', async () => {
    render(<Field initial="2026-10-15" min="2026-10-10" max="2026-10-20" />);
    await userEvent.click(screen.getByLabelText('Day'));

    expect(dayButton('2026-10-09')).toBeDisabled();
    expect(dayButton('2026-10-10')).toBeEnabled();
    expect(dayButton('2026-10-21')).toBeDisabled();
    expect(within(calendar()).getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(within(calendar()).getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('can be cleared when it is optional', async () => {
    const onChange = vi.fn();
    render(<Field initial="2026-10-15" onChange={onChange} clearable />);
    await userEvent.click(screen.getByLabelText('Day'));
    await userEvent.click(within(calendar()).getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByLabelText('Day')).toHaveTextContent('Pick a date');
  });
});
