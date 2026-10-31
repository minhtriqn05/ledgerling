import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select, { findByText, flattenOptions } from './Select.jsx';

const options = [
  { value: 'all', label: 'All categories' },
  { group: 'Expense', options: [{ value: 'c1', label: 'Food' }, { value: 'c2', label: 'Fuel' }] },
  { group: 'Income', options: [{ value: 'c3', label: 'Salary' }] },
];

function renderSelect(props = {}) {
  const onChange = vi.fn();
  render(
    <>
      <label htmlFor="category">Category</label>
      <Select id="category" value="all" options={options} onChange={onChange} {...props} />
    </>
  );
  return { onChange, picker: screen.getByRole('combobox', { name: 'Category' }) };
}

describe('Select helpers', () => {
  it('flattens groups and keeps the group name', () => {
    expect(flattenOptions(options).map((o) => `${o.group}:${o.value}`)).toEqual([':all', 'Expense:c1', 'Expense:c2', 'Income:c3']);
  });

  it('finds the next option that starts with the typed text, wrapping around', () => {
    const flat = flattenOptions(options);
    expect(findByText(flat, 'f', 0)).toBe(1);
    expect(findByText(flat, 'f', 1)).toBe(2);
    expect(findByText(flat, 'f', 2)).toBe(1);
    expect(findByText(flat, 'fu', 0)).toBe(2);
    expect(findByText(flat, 'x', 0)).toBe(-1);
  });
});

describe('Select', () => {
  it('shows the chosen option and opens a grouped list', async () => {
    const { picker } = renderSelect({ value: 'c3' });
    expect(picker).toHaveTextContent('Salary');
    expect(picker).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(picker);
    const list = screen.getByRole('listbox');
    expect(within(list).getByRole('group', { name: 'Expense' })).toHaveTextContent('FoodFuel');
    expect(within(list).getByRole('group', { name: 'Income' })).toHaveTextContent('Salary');
    expect(screen.getByRole('option', { name: 'Salary' })).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange with the clicked option and closes', async () => {
    const { onChange, picker } = renderSelect();
    await userEvent.click(picker);
    await userEvent.click(screen.getByRole('option', { name: 'Fuel' }));

    expect(onChange).toHaveBeenCalledWith('c2');
    expect(picker).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a click outside without a change', async () => {
    const { onChange, picker } = renderSelect();
    await userEvent.click(picker);
    await userEvent.click(document.body);

    expect(picker).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('goes to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    const { onChange, picker } = renderSelect();
    picker.focus();
    await user.keyboard('{ArrowDown}{End}');
    expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Salary' }).id);
    await user.keyboard('{Home}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('c1');
  });
});
