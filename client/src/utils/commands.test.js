import { describe, expect, it } from 'vitest';
import { filterCommands, normalizeText, pageCommands, transactionPath } from './commands.js';

const t = (key) => key;
const commands = (...labels) => labels.map((label) => ({ id: label, label }));
const labels = (list) => list.map((command) => command.label);

describe('normalizeText', () => {
  it('leaves out case and accents', () => {
    expect(normalizeText('Giao dịch')).toBe('giao dich');
    expect(normalizeText('Đặt lại')).toBe('dat lai');
    expect(normalizeText('Réglages')).toBe('reglages');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('filterCommands', () => {
  const list = commands('Dashboard', 'Budgets', 'Add transaction', 'Transactions');

  it('gives everything without text', () => {
    expect(labels(filterCommands(list, ''))).toEqual(labels(list));
    expect(labels(filterCommands(list, '   '))).toEqual(labels(list));
  });

  it('finds a part of the label, in any case', () => {
    expect(labels(filterCommands(list, 'BUDG'))).toEqual(['Budgets']);
  });

  it('puts a label that starts with the text first', () => {
    expect(labels(filterCommands(list, 'trans'))).toEqual(['Transactions', 'Add transaction']);
  });

  it('wants every word, in any order', () => {
    expect(labels(filterCommands(list, 'transaction add'))).toEqual(['Add transaction']);
    expect(filterCommands(list, 'add budget')).toEqual([]);
  });

  it('finds Vietnamese without its accents', () => {
    expect(labels(filterCommands(commands('Giao dịch', 'Ngân sách'), 'ngan sach'))).toEqual(['Ngân sách']);
  });
});

describe('pageCommands', () => {
  const paths = (user) => pageCommands(user, t).map((command) => command.path);

  it('has every page of the menu and every section of Settings', () => {
    const list = paths({ role: 'user' });
    expect(list).toContain('/budgets');
    expect(list).toContain('/settings/security');
    expect(list).toContain('/settings/danger');
  });

  it('has Admin only for an admin', () => {
    expect(paths({ role: 'user' })).not.toContain('/admin');
    expect(paths({ role: 'admin' })).toContain('/admin');
  });

  it('has no Security and Danger zone for the demo account', () => {
    const list = paths({ role: 'user', isDemo: true });
    expect(list).not.toContain('/settings/security');
    expect(list).not.toContain('/settings/danger');
    expect(list).toContain('/settings/profile');
  });
});

describe('transactionPath', () => {
  it('opens the day of the transaction in Vietnam time, filtered by its note', () => {
    // 20:00 UTC on the 14th is already the 15th in Vietnam
    expect(transactionPath({ date: '2026-10-14T20:00:00.000Z', note: 'Cà phê & bánh' })).toBe(
      `/transactions?from=2026-10-15&to=2026-10-15&q=${encodeURIComponent('Cà phê & bánh').replace(/%20/g, '+')}`
    );
  });

  it('has no filter by note when there is none', () => {
    expect(transactionPath({ date: '2026-10-14T05:00:00.000Z', note: '' })).toBe('/transactions?from=2026-10-14&to=2026-10-14');
  });
});
