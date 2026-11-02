import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios.js';
import * as admin from './admin.js';
import * as auth from './auth.js';
import * as budgets from './budgets.js';
import * as categories from './categories.js';
import * as goals from './goals.js';
import * as health from './health.js';
import * as notifications from './notifications.js';
import * as recurring from './recurring.js';
import * as reports from './reports.js';
import * as stats from './stats.js';
import * as tags from './tags.js';
import * as templates from './templates.js';
import * as transactions from './transactions.js';
import * as users from './users.js';
import * as wallets from './wallets.js';

// The contract between the pages and the API (docs/api-plan.md): every function of src/api calls the right method
// and address with the right body or query, and hands back the part of the answer the pages use.

vi.mock('./axios.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const DATA = { _id: 'x1' };
const META = { page: 1, limit: 20, total: 1, totalPages: 1 };

beforeEach(() => {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    api[method].mockReset();
    api[method].mockResolvedValue({ data: { success: true, data: DATA, meta: META } });
  }
});

// [function call, method, the arguments axios gets]
const CALLS = [
  [() => auth.register({ name: 'Tri', email: 'a@b.co', password: 'secret123' }), 'post', ['/auth/register', { name: 'Tri', email: 'a@b.co', password: 'secret123' }]],
  [() => auth.login({ email: 'a@b.co', password: 'secret123' }), 'post', ['/auth/login', { email: 'a@b.co', password: 'secret123' }]],
  [() => auth.loginDemo(), 'post', ['/auth/demo']],
  [() => auth.getMe(), 'get', ['/auth/me']],
  [() => categories.getCategories(), 'get', ['/categories']],
  [() => categories.createCategory({ name: 'Pets' }), 'post', ['/categories', { name: 'Pets' }]],
  [() => categories.updateCategory('c1', { name: 'Cats' }), 'patch', ['/categories/c1', { name: 'Cats' }]],
  [() => categories.deleteCategory('c1'), 'delete', ['/categories/c1']],
  [() => transactions.createTransaction({ amount: 1 }), 'post', ['/transactions', { amount: 1 }]],
  [() => transactions.updateTransaction('t1', { note: 'n' }), 'patch', ['/transactions/t1', { note: 'n' }]],
  [() => transactions.deleteTransaction('t1'), 'delete', ['/transactions/t1']],
  [() => transactions.importTransactions([{ amount: 1 }]), 'post', ['/transactions/import', { rows: [{ amount: 1 }] }]],
  [() => transactions.bulkDeleteTransactions(['t1', 't2']), 'post', ['/transactions/bulk-delete', { ids: ['t1', 't2'] }]],
  [() => transactions.bulkChangeCategory(['t1'], 'c2'), 'patch', ['/transactions/bulk-category', { ids: ['t1'], categoryId: 'c2' }]],
  [() => stats.getSummary('2026-10'), 'get', ['/stats/summary', { params: { month: '2026-10' } }]],
  [() => budgets.getBudgets('2026-10'), 'get', ['/budgets', { params: { month: '2026-10' } }]],
  [() => budgets.getBudgets(), 'get', ['/budgets', { params: {} }]],
  [() => budgets.createBudget({ amount: 5 }), 'post', ['/budgets', { amount: 5 }]],
  [() => budgets.copyBudgets('2026-09', '2026-10'), 'post', ['/budgets/copy', { fromMonth: '2026-09', toMonth: '2026-10' }]],
  [() => budgets.updateBudget('b1', 9), 'patch', ['/budgets/b1', { amount: 9 }]],
  [() => budgets.deleteBudget('b1'), 'delete', ['/budgets/b1']],
  [() => tags.getTags(), 'get', ['/tags']],
  [() => recurring.getRecurringRules(), 'get', ['/recurring']],
  [() => recurring.createRecurringRule({ amount: 1 }), 'post', ['/recurring', { amount: 1 }]],
  [() => recurring.updateRecurringRule('r1', { amount: 2 }), 'put', ['/recurring/r1', { amount: 2 }]],
  [() => recurring.toggleRecurringRule('r1'), 'patch', ['/recurring/r1/toggle']],
  [() => recurring.deleteRecurringRule('r1'), 'delete', ['/recurring/r1']],
  [() => goals.getGoals(), 'get', ['/goals']],
  [() => goals.getGoal('g1'), 'get', ['/goals/g1']],
  [() => goals.createGoal({ name: 'Trip' }), 'post', ['/goals', { name: 'Trip' }]],
  [() => goals.updateGoal('g1', { name: 'Bike' }), 'put', ['/goals/g1', { name: 'Bike' }]],
  [() => goals.deleteGoal('g1'), 'delete', ['/goals/g1']],
  [() => goals.addContribution('g1', { amount: 5 }), 'post', ['/goals/g1/contributions', { amount: 5 }]],
  [() => goals.deleteContribution('g1', 'k1'), 'delete', ['/goals/g1/contributions/k1']],
  [() => reports.getMonthlyReport('2026-10'), 'get', ['/reports/monthly', { params: { month: '2026-10' } }]],
  [() => reports.getYearlyReport('2026'), 'get', ['/reports/yearly', { params: { year: '2026' } }]],
  [() => reports.getInsights('2026-10'), 'get', ['/insights', { params: { month: '2026-10' } }]],
  [() => templates.getTemplates(), 'get', ['/templates']],
  [() => templates.createTemplate({ name: 'Tea' }), 'post', ['/templates', { name: 'Tea' }]],
  [() => templates.deleteTemplate('p1'), 'delete', ['/templates/p1']],
  [() => notifications.markRead('n1'), 'patch', ['/notifications/n1/read']],
  [() => notifications.markAllRead(), 'patch', ['/notifications/read-all']],
  [() => notifications.deleteNotification('n1'), 'delete', ['/notifications/n1']],
  [() => notifications.updateNotificationSettings({ budget: false }), 'patch', ['/users/me/preferences', { notifications: { budget: false } }]],
  [() => users.updateProfile('Tri'), 'patch', ['/users/me', { name: 'Tri' }]],
  [() => users.setAvatar({ type: 'preset', value: 'cat' }), 'patch', ['/users/me/avatar', { type: 'preset', value: 'cat' }]],
  [() => users.removeAvatar(), 'delete', ['/users/me/avatar']],
  [() => users.changePassword('old-secret', 'new-secret'), 'patch', ['/users/me/password', { currentPassword: 'old-secret', newPassword: 'new-secret' }]],
  [() => users.logoutAllDevices(), 'post', ['/auth/logout-all']],
  [() => users.updatePreferences({ theme: 'light' }), 'patch', ['/users/me/preferences', { theme: 'light' }]],
  [() => users.exportMyData(), 'get', ['/users/me/export']],
  [() => wallets.getWallets(), 'get', ['/wallets']],
  [() => wallets.createWallet({ name: 'Bank' }), 'post', ['/wallets', { name: 'Bank' }]],
  [() => wallets.updateWallet('w1', { archived: true }), 'patch', ['/wallets/w1', { archived: true }]],
  [() => wallets.deleteWallet('w1'), 'delete', ['/wallets/w1']],
  [() => wallets.createTransfer({ amount: 1 }), 'post', ['/transfers', { amount: 1 }]],
  [() => wallets.deleteTransfer('x1'), 'delete', ['/transfers/x1']],
  [() => admin.getAdminStats(), 'get', ['/admin/stats']],
  [() => admin.setUserStatus('u1', 'disabled'), 'patch', ['/admin/users/u1/status', { status: 'disabled' }]],
];

describe('src/api', () => {
  it.each(CALLS.map(([call, method, args]) => [`${method.toUpperCase()} ${args[0]}`, call, method, args]))(
    '%s: the right request, and the data of the answer back',
    async (_label, call, method, args) => {
      const result = await call();
      expect(api[method]).toHaveBeenCalledWith(...args);
      expect(result).toEqual(DATA);
    }
  );

  it('a paginated list gives its items and its meta', async () => {
    expect(await transactions.getTransactions({ month: '2026-10' })).toEqual({ items: DATA, meta: META });
    expect(api.get).toHaveBeenCalledWith('/transactions', { params: { month: '2026-10' } });

    expect(await wallets.getTransfers({ walletId: 'w1' })).toEqual({ items: DATA, meta: META });
    expect(api.get).toHaveBeenCalledWith('/transfers', { params: { walletId: 'w1' } });

    expect(await admin.getAdminUsers({ q: '', page: 2 })).toEqual({ users: DATA, meta: META });
    expect(api.get).toHaveBeenCalledWith('/admin/users', { params: { q: undefined, page: 2 } });
  });

  it('notifications: unread only when asked, and the count of the unread ones', async () => {
    await notifications.getNotifications();
    expect(api.get).toHaveBeenLastCalledWith('/notifications', { params: { page: 1, limit: 20 } });
    await notifications.getNotifications({ page: 2, limit: 10, unread: true });
    expect(api.get).toHaveBeenLastCalledWith('/notifications', { params: { page: 2, limit: 10, unread: true } });

    api.get.mockResolvedValueOnce({ data: { success: true, data: { count: 4 } } });
    expect(await notifications.getUnreadCount()).toBe(4);
  });

  it('deleting the account sends the password in the body', async () => {
    await users.deleteAccount('secret123');
    expect(api.delete).toHaveBeenCalledWith('/users/me', { data: { password: 'secret123' } });
  });

  it('the health check is up only when the API says success', async () => {
    const signal = new AbortController().signal;
    expect(await health.checkHealth({ signal, timeout: 5000 })).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/health', { signal, timeout: 5000 });
    api.get.mockResolvedValueOnce({ data: {} });
    expect(await health.checkHealth({ signal, timeout: 5000 })).toBe(false);
  });

  describe('CSV export', () => {
    it('downloads the file with the name the server gives it', async () => {
      const blob = new Blob(['csv']);
      api.get.mockResolvedValueOnce({ data: blob, headers: { 'content-disposition': 'attachment; filename="ledgerling-2026-10.csv"' } });
      expect(await transactions.exportTransactions({ month: '2026-10' })).toEqual({ blob, filename: 'ledgerling-2026-10.csv' });
      expect(api.get).toHaveBeenCalledWith('/transactions/export', { params: { month: '2026-10' }, responseType: 'blob' });
    });

    it('falls back to a plain name without the header', async () => {
      api.get.mockResolvedValueOnce({ data: new Blob(['csv']), headers: {} });
      expect((await transactions.exportTransactions()).filename).toBe('ledgerling.csv');
    });

    it('turns an error that came as a file back into the usual { message, code }', async () => {
      const body = new Blob([JSON.stringify({ success: false, message: 'Month must be in YYYY-MM format', code: 'MONTH_INVALID' })]);
      api.get.mockRejectedValueOnce({ response: { status: 400, data: body } });
      await expect(transactions.exportTransactions({ month: 'x' })).rejects.toMatchObject({
        response: { data: { code: 'MONTH_INVALID' } },
      });
    });

    it('keeps an error that is not JSON as it is', async () => {
      const body = new Blob(['<html>bad gateway</html>']);
      api.get.mockRejectedValueOnce({ response: { status: 502, data: body } });
      await expect(transactions.exportTransactions()).rejects.toMatchObject({ response: { data: body } });
    });
  });
});
