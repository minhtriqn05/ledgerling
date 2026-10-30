import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import QuickAddDialog from './QuickAddDialog.jsx';
import { getCategories } from '../../api/categories.js';
import { getTags } from '../../api/tags.js';
import { deleteTemplate, getTemplates } from '../../api/templates.js';
import { createTransaction } from '../../api/transactions.js';
import { fromDateInput, todayInput } from '../../utils/vnDate.js';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../api/categories.js', () => ({ getCategories: vi.fn() }));
vi.mock('../../api/tags.js', () => ({ getTags: vi.fn() }));
vi.mock('../../api/templates.js', () => ({ getTemplates: vi.fn(), deleteTemplate: vi.fn() }));
vi.mock('../../api/transactions.js', () => ({ createTransaction: vi.fn() }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const categories = [
  { _id: 'food', name: 'Food', type: 'expense', color: '#F07D62', icon: '🍜' },
  { _id: 'transport', name: 'Transport', type: 'expense', color: '#4A9FE3', icon: '🚌' },
  { _id: 'salary', name: 'Salary', type: 'income', color: '#3DB383', icon: null },
];

const template = {
  _id: 't1',
  name: 'Morning coffee',
  amount: 35000,
  note: 'Coffee',
  category: categories[0],
};

function renderDialog() {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn() };
  render(
    <MemoryRouter>
      <QuickAddDialog {...handlers} />
    </MemoryRouter>
  );
  return handlers;
}

// The dialog is ready when the category chips are on screen
async function renderReady() {
  const handlers = renderDialog();
  await screen.findByRole('button', { name: 'Food' });
  return handlers;
}

const amountBox = () => screen.getByLabelText('Amount');
const quickText = () => screen.getByLabelText('Quick text');
const chip = (name) => screen.getByRole('button', { name });

beforeAll(() => {
  // jsdom has no <dialog> behaviour yet; the Modal only needs showModal to exist
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  getCategories.mockResolvedValue(categories);
  getTemplates.mockResolvedValue([]);
  getTags.mockResolvedValue([]);
  createTransaction.mockResolvedValue({ _id: 'new' });
});

describe('QuickAddDialog: the text line', () => {
  it('reads "coffee 35k #work" into the fields', async () => {
    await renderReady();
    await userEvent.type(quickText(), 'coffee 35k #work');

    expect(amountBox()).toHaveValue('35.000');
    expect(chip('Food')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Transport')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Note')).toHaveValue('coffee');
    expect(screen.getByRole('button', { name: 'Remove tag work' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue(todayInput());
  });

  it('saves what the preview shows, dated today by default', async () => {
    const { onSaved, onClose } = await renderReady();
    await userEvent.type(quickText(), 'coffee 35k #work');
    await userEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createTransaction).toHaveBeenCalledWith({
      categoryId: 'food',
      amount: 35000,
      note: 'coffee',
      tags: ['work'],
      date: fromDateInput(todayInput()),
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Transaction added');
  });

  it('Enter in the text line saves too', async () => {
    const { onClose } = await renderReady();
    await userEvent.type(quickText(), 'salary 15tr{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // "salary" is in the income category of the same name
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'salary', amount: 15000000, note: 'salary' })
    );
  });

  it('reads "yesterday" into the date field', async () => {
    await renderReady();
    await userEvent.type(quickText(), 'taxi 80k yesterday');

    const yesterday = new Date(`${todayInput()}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect(screen.getByLabelText('Date')).toHaveValue(yesterday.toISOString().slice(0, 10));
    expect(chip('Transport')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps a field the user changed by hand when the text changes again', async () => {
    await renderReady();
    await userEvent.type(quickText(), 'coffee 35k');
    await userEvent.clear(amountBox());
    await userEvent.type(amountBox(), '50000');
    await userEvent.click(chip('Transport'));

    await userEvent.type(quickText(), ' 99k #work');

    expect(amountBox()).toHaveValue('50.000'); // not 99.000
    expect(chip('Transport')).toHaveAttribute('aria-pressed', 'true'); // not Food
    // fields that were not touched still follow the text
    expect(screen.getByRole('button', { name: 'Remove tag work' })).toBeInTheDocument();
  });

  it('clearing the text line starts again', async () => {
    await renderReady();
    await userEvent.type(quickText(), 'coffee 35k');
    await userEvent.click(chip('Transport'));
    await userEvent.clear(quickText());

    expect(amountBox()).toHaveValue('');
    expect(chip('Transport')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Food')).toHaveAttribute('aria-pressed', 'false');
  });

  it('says when no amount was found', async () => {
    await renderReady();
    await userEvent.type(quickText(), 'just coffee');
    expect(screen.getByText('No amount found in the text. Type one below.')).toBeInTheDocument();
  });
});

describe('QuickAddDialog: the fields', () => {
  it('saves a transaction typed into the fields only', async () => {
    const { onClose } = await renderReady();
    await userEvent.type(amountBox(), '120000');
    await userEvent.click(chip('Transport'));
    await userEvent.type(screen.getByLabelText('Note'), 'Bus pass');
    await userEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createTransaction).toHaveBeenCalledWith({
      categoryId: 'transport',
      amount: 120000,
      note: 'Bus pass',
      tags: [],
      date: fromDateInput(todayInput()),
    });
  });

  it('asks for an amount before calling the API', async () => {
    await renderReady();
    await userEvent.click(chip('Food'));
    await userEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(screen.getByText('Please enter an amount greater than 0.')).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('asks for a category before calling the API', async () => {
    await renderReady();
    await userEvent.type(amountBox(), '50000');
    await userEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    expect(screen.getByText('Please choose a category.')).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the error when the API fails', async () => {
    createTransaction.mockRejectedValue({ response: { data: { message: 'Category not found' } } });
    const { onClose, onSaved } = await renderReady();
    await userEvent.type(quickText(), 'coffee 35k');
    await userEvent.click(screen.getByRole('button', { name: 'Save transaction' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Category not found'));
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save transaction' })).toBeEnabled();
  });

  it('shows the groups of categories with their icons', async () => {
    await renderReady();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('🍜')).toBeInTheDocument();
    expect(screen.getByText('🚌')).toBeInTheDocument();
  });
});

describe('QuickAddDialog: templates', () => {
  beforeEach(() => {
    getTemplates.mockResolvedValue([template]);
  });

  it('a click on a template chip saves it as a transaction dated today', async () => {
    const { onSaved, onClose } = renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: /^Morning coffee/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createTransaction).toHaveBeenCalledWith({
      categoryId: 'food',
      amount: 35000,
      note: 'Coffee',
      date: fromDateInput(todayInput()),
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Added "Morning coffee"');
  });

  it('shows the amount on the chip', async () => {
    renderDialog();
    expect(await screen.findByRole('button', { name: /Morning coffee.*35\.000/ })).toBeInTheDocument();
  });

  it('shows no template row when there are no templates', async () => {
    getTemplates.mockResolvedValue([]);
    await renderReady();
    expect(screen.queryByRole('region', { name: 'Templates' })).not.toBeInTheDocument();
  });

  it('still lets the user add a transaction when the templates cannot be loaded', async () => {
    getTemplates.mockRejectedValue(new Error('offline'));
    await renderReady();
    expect(screen.queryByRole('region', { name: 'Templates' })).not.toBeInTheDocument();
    expect(chip('Food')).toBeInTheDocument();
  });

  it('deletes a template with its x button', async () => {
    deleteTemplate.mockResolvedValue({ _id: 't1' });
    renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete template Morning coffee' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Morning coffee/ })).not.toBeInTheDocument());
    expect(deleteTemplate).toHaveBeenCalledWith('t1');
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('keeps the chip when deleting the template fails', async () => {
    deleteTemplate.mockRejectedValue({ response: { data: { message: 'Template not found' } } });
    renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete template Morning coffee' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Template not found'));
    expect(screen.getByRole('button', { name: /^Morning coffee/ })).toBeInTheDocument();
  });
});
