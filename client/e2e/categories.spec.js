import { expect, test } from '@playwright/test';

// Categories: create one, rename it, see that a category with transactions cannot be deleted, then delete one.
const API_URL = 'http://localhost:4100/api';

async function register(page, testInfo) {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Category Tester');
  await page.getByLabel('Email').fill(`e2e-categories-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

// A category card shows its name as a heading; asking to delete it turns the card into a group named by the question
const card = (page, name) => page.getByRole('heading', { name, level: 2, exact: true });
const confirmDelete = (page, name) => page.getByRole('group', { name: `Delete "${name}"?` }).getByRole('button', { name: 'Delete', exact: true });

test('create, rename and delete a category; one with transactions cannot be deleted', { tag: '@smoke' }, async ({ page }, testInfo) => {
  await register(page, testInfo);
  await page.goto('/categories');
  await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible();
  // The default categories of a new account
  await expect(card(page, 'Food')).toBeVisible();

  // 1. Create "Pets" (expense)
  await page.getByRole('button', { name: 'New category' }).first().click();
  await page.getByLabel('Name', { exact: true }).fill('Pets');
  await page.getByRole('button', { name: 'Create category' }).click();
  await expect(page.getByText('Category added')).toBeVisible();
  await expect(card(page, 'Pets')).toBeVisible();

  // 2. Rename it
  await page.getByRole('button', { name: 'Edit Pets' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Pet care');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Category updated')).toBeVisible();
  await expect(card(page, 'Pet care')).toBeVisible();
  await expect(card(page, 'Pets')).toHaveCount(0);

  // 3. Food gets a transaction (through the API, the Transactions page has its own tests), so it cannot be deleted
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const categories = await (await page.request.get(`${API_URL}/categories`, { headers })).json();
  const food = categories.data.find((category) => category.name === 'Food');
  const created = await page.request.post(`${API_URL}/transactions`, { headers, data: { categoryId: food._id, amount: 45000 } });
  expect(created.status()).toBe(201);

  await page.reload();
  await page.getByRole('button', { name: 'Delete Food' }).click();
  await confirmDelete(page, 'Food').click();
  await expect(page.getByText('Category still has transactions')).toBeVisible();
  await expect(card(page, 'Food')).toBeVisible();

  // 4. "Pet care" has none: it goes
  await page.getByRole('button', { name: 'Delete Pet care' }).click();
  await confirmDelete(page, 'Pet care').click();
  await expect(page.getByText('Category deleted')).toBeVisible();
  await expect(card(page, 'Pet care')).toHaveCount(0);
});
