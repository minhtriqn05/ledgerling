import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CategoriesPage from './CategoriesPage.jsx';
import { createCategory, getCategories } from '../api/categories.js';

vi.mock('../api/categories.js', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }));

const FOOD = { _id: 'c1', name: 'Food', type: 'expense', color: '#FF7043', icon: 'utensils' };
const GYM = { _id: 'c2', name: 'Gym', type: 'expense', color: '#4A9FE3', icon: 'dumbbell' };

describe('CategoriesPage', () => {
  it('keeps a category saved while the list was still on its way, and asks for the list again', async () => {
    // The first list is slow: it arrives after the new category was saved, without it
    let answerFirstList;
    getCategories.mockReturnValueOnce(new Promise((resolve) => (answerFirstList = resolve)));
    getCategories.mockResolvedValue([FOOD, GYM]);
    createCategory.mockResolvedValue(GYM);

    render(
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Gym');
    await userEvent.click(screen.getByRole('button', { name: 'Create category' }));
    expect(toast.success).toHaveBeenCalledWith('Category added');

    await act(async () => answerFirstList([FOOD]));

    expect(await screen.findByRole('heading', { name: 'Food', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gym', level: 2 })).toBeInTheDocument();
    expect(getCategories).toHaveBeenCalledTimes(2);
  });
});
