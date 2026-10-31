import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { UnsavedChangesGuard, useUnsavedChanges } from './UnsavedChangesContext.jsx';

// jsdom has no showModal()
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
});

function Form() {
  const [text, setText] = useState('');
  useUnsavedChanges(text !== '');
  return (
    <>
      <label>
        Name
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <Link to="/other">Leave</Link>
      <Link to="/form?tab=2">Same page</Link>
    </>
  );
}

function renderForm() {
  const router = createMemoryRouter(
    [
      {
        path: '/form',
        element: (
          <UnsavedChangesGuard>
            <Form />
          </UnsavedChangesGuard>
        ),
      },
      { path: '/other', element: <p>Other page</p> },
    ],
    { initialEntries: ['/form'] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

const question = () => screen.findByRole('dialog', { name: 'Leave without saving?' });

describe('UnsavedChangesGuard', () => {
  it('lets a clean form go without asking', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('link', { name: 'Leave' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
  });

  it('asks when the form has changes: Stay keeps what was typed', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Name'), 'Tri');
    await user.click(screen.getByRole('link', { name: 'Leave' }));

    const dialog = await question();
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));

    expect(screen.queryByText('Other page')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Tri');
  });

  it('asks when the form has changes: Leave goes on to the other page', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Name'), 'Tri');
    await user.click(screen.getByRole('link', { name: 'Leave' }));

    await user.click(within(await question()).getByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
  });

  it('does not ask when only the query of the same page changes', async () => {
    const user = userEvent.setup();
    const router = renderForm();
    await user.type(screen.getByLabelText('Name'), 'Tri');
    await user.click(screen.getByRole('link', { name: 'Same page' }));

    expect(router.state.location.search).toBe('?tab=2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks the browser before the tab closes, only while the form has changes', async () => {
    const user = userEvent.setup();
    renderForm();
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(event);
      });
      return event.defaultPrevented;
    };

    expect(closing()).toBe(false);
    await user.type(screen.getByLabelText('Name'), 'T');
    expect(closing()).toBe(true);
    await user.clear(screen.getByLabelText('Name'));
    expect(closing()).toBe(false);
  });
});

describe('useUnsavedChanges', () => {
  it('does nothing without a guard, also in a router without blockers', async () => {
    const user = userEvent.setup();
    const closing = vi.fn();
    window.addEventListener('beforeunload', closing);
    render(
      <MemoryRouter>
        <Form />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText('Name'), 'T');
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    expect(closing).toHaveBeenCalledTimes(1);
    window.removeEventListener('beforeunload', closing);
    expect(screen.getByLabelText('Name')).toHaveValue('T');
  });
});
