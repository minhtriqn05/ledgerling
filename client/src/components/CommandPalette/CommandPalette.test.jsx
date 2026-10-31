import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette.jsx';
import i18n from '../../i18n/index.js';
import { getTransactions } from '../../api/transactions.js';
import { updatePreferences } from '../../api/users.js';
import { ThemeProvider } from '../../context/ThemeContext.jsx';

vi.mock('../../api/transactions.js', () => ({ getTransactions: vi.fn() }));
vi.mock('../../api/users.js', () => ({ updatePreferences: vi.fn(async () => ({})) }));
vi.mock('../../api/axios.js', () => ({ getErrorMessage: () => 'failed' }));
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { role: 'user' }, updateUser: vi.fn() }) }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ error: vi.fn() }) }));

const onClose = vi.fn();
const onQuickAdd = vi.fn();

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

function renderPalette() {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <CommandPalette onClose={onClose} onQuickAdd={onQuickAdd} />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

const input = () => screen.getByTestId('command-input');

beforeEach(() => {
  localStorage.clear();
  onClose.mockReset();
  onQuickAdd.mockReset();
  updatePreferences.mockClear();
  getTransactions.mockReset();
  getTransactions.mockResolvedValue({ items: [], meta: {} });
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});
afterEach(() => i18n.changeLanguage('en'));

describe('CommandPalette', () => {
  it('lists the pages and the commands, with the first one highlighted', () => {
    renderPalette();

    for (const name of ['Dashboard', 'Budgets', 'Settings › Security', 'Add transaction', 'Toggle theme', 'Change language']) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('option', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Dashboard' }).id);
  });

  it('narrows the list while typing, and Enter jumps to the page', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(input(), 'budg');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Budgets']);

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/budgets');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves with the arrows and goes around at the ends', async () => {
    const user = userEvent.setup();
    renderPalette();
    const selected = () => screen.getAllByRole('option').find((option) => option.getAttribute('aria-selected') === 'true');
    input().focus();

    await user.keyboard('{ArrowDown}');
    expect(selected()).toHaveTextContent('Transactions');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(selected()).toHaveTextContent('Change language');
  });

  it('runs Add transaction and Toggle theme', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.click(screen.getByRole('option', { name: 'Add transaction' }));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('option', { name: 'Toggle theme' }));
    expect(updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('Change language turns the list into the languages, Escape goes back', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.click(screen.getByRole('option', { name: 'Change language' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole('option')).toHaveLength(8);
    expect(screen.queryByRole('option', { name: 'Dashboard' })).not.toBeInTheDocument();

    input().focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('option', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('changes the language from that list', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole('option', { name: 'Change language' }));

    await user.click(screen.getByRole('option', { name: 'Deutsch' }));
    expect(i18n.resolvedLanguage).toBe('de');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('finds transactions by their note and opens the page on that day', async () => {
    const user = userEvent.setup();
    getTransactions.mockResolvedValue({
      items: [{ _id: 't1', note: 'Coffee beans', type: 'expense', amount: 90000, date: '2026-10-14T05:00:00.000Z', category: { name: 'Food' } }],
      meta: {},
    });
    renderPalette();

    await user.type(input(), 'coffee');

    const row = await screen.findByRole('option', { name: /Coffee beans/ });
    expect(getTransactions).toHaveBeenCalledWith({ q: 'coffee', from: '2000-01-01', limit: 5 });
    expect(row).toHaveTextContent('14 Oct 2026');

    await user.click(row);
    expect(screen.getByTestId('where')).toHaveTextContent('/transactions?from=2026-10-14&to=2026-10-14&q=Coffee+beans');
  });

  it('does not search for one letter, and waits for the typing to stop', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(input(), 'c');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getTransactions).not.toHaveBeenCalled();

    await user.type(input(), 'of');
    await waitFor(() => expect(getTransactions).toHaveBeenCalledTimes(1));
    expect(getTransactions).toHaveBeenCalledWith(expect.objectContaining({ q: 'cof' }));
  });

  it('says so when nothing is found, and when the search failed', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(input(), 'zzzz');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nothing found'));

    getTransactions.mockRejectedValue(new Error('offline'));
    await user.type(input(), 'y');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('could not be searched'));
  });
});
