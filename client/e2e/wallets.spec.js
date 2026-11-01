import { expect, test } from '@playwright/test';
import { chooseOption } from './helpers/controls.js';

// Phase 23: wallets and transfers. Every test starts with a new account, so its numbers are its own.
const API_URL = 'http://localhost:4100/api';

async function openMenuIfNeeded(page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

async function register(page, testInfo, label) {
  const email = `wallets-${label}-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Wallet Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// Calls the API as the signed-in user, for the setup that is not what the test is about
async function apiCall(page, method, path, data) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.fetch(`${API_URL}${path}`, { method, data, headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}

async function categoryId(page, name) {
  const categories = await apiCall(page, 'GET', '/categories');
  return categories.find((category) => category.name === name)._id;
}

// The card of one wallet (each card is a list item)
const cardOf = (page, name) => page.locator('main').getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
const balanceOf = (page, name) => cardOf(page, name).getByTestId('wallet-balance');

async function addWallet(page, { name, initial }) {
  await page.getByRole('button', { name: 'New wallet' }).click();
  const dialog = page.getByRole('dialog', { name: 'New wallet' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Starting balance').fill(String(initial));
  await dialog.getByRole('button', { name: 'Save wallet' }).click();
  await expect(dialog).toBeHidden();
}

async function moveMoney(page, { from, to, amount, note }) {
  await page.getByRole('button', { name: 'Transfer money' }).click();
  const dialog = page.getByRole('dialog', { name: 'Transfer money' });
  await chooseOption(dialog.getByRole('combobox', { name: 'From' }), from);
  await chooseOption(dialog.getByRole('combobox', { name: 'To' }), to);
  await dialog.getByLabel('Amount').fill(String(amount));
  if (note) await dialog.getByLabel('Note').fill(note);
  await dialog.getByRole('button', { name: 'Move money' }).click();
  await expect(dialog).toBeHidden();
}

test('create a wallet → move money → the balances change, and income and expense stay the same', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'flow');

  // Every user has Cash, and one wallet is not enough to move money
  await openMenuIfNeeded(page);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Wallets' }).click();
  await expect(page.getByRole('heading', { name: 'Wallets', level: 1 })).toBeVisible();
  await expect(balanceOf(page, 'Cash')).toHaveText(/^0\s₫$/);
  await expect(page.getByRole('button', { name: 'Transfer money' })).toBeDisabled();
  await expect(page.getByText('You need at least two wallets to move money.')).toBeVisible();

  // A new wallet with money in it
  await addWallet(page, { name: 'Vietcombank', initial: 1000000 });
  await expect(page.getByText('Wallet added')).toBeVisible();
  await expect(balanceOf(page, 'Vietcombank')).toHaveText(/^1,000,000\s₫$/);
  await expect(page.getByTestId('wallets-total')).toHaveText(/^1,000,000\s₫$/);

  // Some real income and expense, to compare with after the transfer
  const wallets = await apiCall(page, 'GET', '/wallets');
  const bank = wallets.find((wallet) => wallet.name === 'Vietcombank');
  await apiCall(page, 'POST', '/transactions', { categoryId: await categoryId(page, 'Salary'), amount: 500000, walletId: bank._id });
  await apiCall(page, 'POST', '/transactions', { categoryId: await categoryId(page, 'Food'), amount: 100000 });
  await page.reload();
  await expect(balanceOf(page, 'Vietcombank')).toHaveText(/^1,500,000\s₫$/);
  await expect(balanceOf(page, 'Cash')).toHaveText(/^-100,000\s₫$/);

  // Move money: one goes down, the other goes up, the total stays
  await moveMoney(page, { from: 'Vietcombank', to: 'Cash', amount: 300000, note: 'ATM' });
  await expect(page.getByText('Money moved')).toBeVisible();
  await expect(balanceOf(page, 'Vietcombank')).toHaveText(/^1,200,000\s₫$/);
  await expect(balanceOf(page, 'Cash')).toHaveText(/^200,000\s₫$/);
  await expect(page.getByTestId('wallets-total')).toHaveText(/^1,400,000\s₫$/);
  await expect(page.getByText(/· ATM$/)).toBeVisible();

  // The Dashboard: the total of all the wallets, and the transfer is not income or expense
  await page.goto('/');
  await expect(page.getByTestId('stat-income')).toHaveText(/^500,000\s₫$/);
  await expect(page.getByTestId('stat-expense')).toHaveText(/^100,000\s₫$/);
  await expect(page.getByTestId('stat-balance')).toHaveText(/^400,000\s₫$/);
  await expect(page.getByTestId('wallets-total')).toHaveText(/^1,400,000\s₫$/);

  // Deleting the transfer puts the money back
  await page.goto('/wallets');
  await page.getByRole('button', { name: 'Delete the transfer from Vietcombank to Cash' }).click();
  const question = page.getByRole('dialog', { name: 'Delete this transfer?' });
  await question.getByRole('button', { name: 'Delete' }).click();
  await expect(question).toBeHidden();
  await expect(balanceOf(page, 'Vietcombank')).toHaveText(/^1,500,000\s₫$/);
  await expect(balanceOf(page, 'Cash')).toHaveText(/^-100,000\s₫$/);
});

test('choose a wallet in the form and in Quick add, and filter the list by wallet', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'choose');
  await apiCall(page, 'POST', '/wallets', { name: 'MoMo', type: 'ewallet', color: '#7D8CE8', initialBalance: 0 });

  // The form: Cash is chosen until another one is picked
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const form = page.getByRole('dialog', { name: 'Add transaction' });
  await form.getByLabel('Amount').fill('70000');
  await form.getByRole('button', { name: 'Food' }).click();
  await form.getByLabel('Note').fill('In momo');
  await expect(form.getByRole('combobox', { name: 'Wallet' })).toHaveText('Cash');
  await chooseOption(form.getByRole('combobox', { name: 'Wallet' }), 'MoMo');
  await form.getByRole('button', { name: 'Save transaction' }).click();
  await expect(form).toBeHidden();

  // Quick add
  await page.getByRole('button', { name: 'Quick add' }).click();
  const quick = page.getByRole('dialog', { name: 'Quick add' });
  await quick.getByLabel('Quick text').fill('coffee 35k');
  await quick.getByRole('button', { name: 'Food' }).click();
  await expect(quick.getByRole('combobox', { name: 'Wallet' })).toHaveText('Cash');
  await quick.getByRole('button', { name: 'Save transaction' }).click();
  await expect(quick).toBeHidden();

  await expect(page.getByText('In momo').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('coffee').filter({ visible: true })).toBeVisible();

  // The filter keeps the wallet in the address, and F5 keeps the filter
  await chooseOption(page.getByRole('combobox', { name: 'Wallet' }), 'MoMo');
  await expect(page).toHaveURL(/wallet=/);
  await expect(page.getByText('coffee').filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText('In momo').filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Wallet' })).toHaveText('MoMo');
  await expect(page.getByText('coffee').filter({ visible: true })).toHaveCount(0);

  // The details of a transaction name its wallet
  await page.getByText('In momo').filter({ visible: true }).click();
  await expect(page.getByRole('dialog', { name: 'Transaction details' })).toContainText('MoMo');
});

test('the default wallet is locked; a wallet with a history can be archived, not deleted; an empty one can be deleted', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await register(page, testInfo, 'archive');
  const used = await apiCall(page, 'POST', '/wallets', { name: 'Used', type: 'bank', color: '#4A9FE3', initialBalance: 50000 });
  await apiCall(page, 'POST', '/wallets', { name: 'Empty', type: 'cash', color: '#22ADA3', initialBalance: 0 });
  await apiCall(page, 'POST', '/transactions', { categoryId: await categoryId(page, 'Food'), amount: 1000, walletId: used._id });

  await page.goto('/wallets');
  await expect(cardOf(page, 'Cash').getByRole('button', { name: 'Archive Cash' })).toHaveCount(0);
  await expect(cardOf(page, 'Cash').getByRole('button', { name: 'Delete Cash' })).toHaveCount(0);

  // A history: the server says no, and says what to do instead
  await page.getByRole('button', { name: 'Delete Used' }).click();
  const question = page.getByRole('dialog', { name: 'Delete this wallet?' });
  await question.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('This wallet still has transactions or transfers. Archive it instead.')).toBeVisible();
  await question.getByRole('button', { name: 'Cancel' }).click();

  // Archive: it keeps its balance, it counts in the total, and it is no longer offered
  await page.getByRole('button', { name: 'Archive Used' }).click();
  await expect(page.getByRole('heading', { name: 'Archived' })).toBeVisible();
  await expect(balanceOf(page, 'Used')).toHaveText(/^49,000\s₫$/);
  await expect(page.getByTestId('wallets-total')).toHaveText(/^49,000\s₫$/);
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Add transaction' }).first().click();
  const form = page.getByRole('dialog', { name: 'Add transaction' });
  await form.getByRole('combobox', { name: 'Wallet' }).click();
  await expect(page.getByRole('option', { name: 'Used', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // Bring it back
  await page.goto('/wallets');
  await page.getByRole('button', { name: 'Bring back Used' }).click();
  await expect(page.getByRole('heading', { name: 'Archived' })).toHaveCount(0);

  // Without a history it can go
  await page.getByRole('button', { name: 'Delete Empty' }).click();
  await page.getByRole('dialog', { name: 'Delete this wallet?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Wallet deleted')).toBeVisible();
  await expect(cardOf(page, 'Empty')).toHaveCount(0);
});
