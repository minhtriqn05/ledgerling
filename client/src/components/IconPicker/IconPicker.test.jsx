import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconPicker from './IconPicker.jsx';
import { ICON_NAMES } from '../../utils/categoryIcons.js';

describe('IconPicker', () => {
  it('shows every icon in named groups, and Auto', () => {
    render(<IconPicker value={null} onChange={vi.fn()} color="#4A9FE3" />);
    expect(screen.getAllByRole('button')).toHaveLength(ICON_NAMES.length + 1);
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Food & drink' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Income' })).toBeInTheDocument();
  });

  it('marks the chosen icon as pressed', () => {
    render(<IconPicker value="coffee" onChange={vi.fn()} color="#4A9FE3" />);
    expect(screen.getByRole('button', { name: 'coffee' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the matching icon for an old emoji', () => {
    render(<IconPicker value="🍜" onChange={vi.fn()} color="#4A9FE3" />);
    expect(screen.getByRole('button', { name: 'utensils' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the icon name, and null for Auto', async () => {
    const onChange = vi.fn();
    render(<IconPicker value="coffee" onChange={onChange} color="#4A9FE3" />);
    await userEvent.click(screen.getByRole('button', { name: 'plane' }));
    expect(onChange).toHaveBeenCalledWith('plane');
    await userEvent.click(screen.getByRole('button', { name: 'Auto' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('cannot be used while disabled', async () => {
    const onChange = vi.fn();
    render(<IconPicker value={null} onChange={onChange} color="#4A9FE3" disabled />);
    await userEvent.click(screen.getByRole('button', { name: 'plane' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
