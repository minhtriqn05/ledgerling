import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs.jsx';
import { BreadcrumbProvider, useBreadcrumbDetail } from '../../context/BreadcrumbContext.jsx';

function renderAt(url, extra = null) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BreadcrumbProvider>
        <Breadcrumbs />
        {extra}
        <Routes>
          <Route path="*" element={<p>page</p>} />
        </Routes>
      </BreadcrumbProvider>
    </MemoryRouter>
  );
}

const trail = () => within(screen.getByRole('navigation', { name: 'Breadcrumb' }));

describe('Breadcrumbs', () => {
  it('is a navigation landmark called Breadcrumb, with an ordered list', () => {
    renderAt('/reports?tab=yearly');

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(trail().getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows Dashboard / Reports / Yearly, with links above the current item and aria-current on the last one', () => {
    renderAt('/reports?tab=yearly');

    expect(trail().getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(trail().getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    const current = trail().getByText('Yearly');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.closest('a')).toBeNull();
    // Only one item is the current one
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('shows just "Dashboard" on the Dashboard', () => {
    renderAt('/');

    expect(trail().getAllByRole('listitem')).toHaveLength(1);
    expect(trail().getByText('Dashboard')).toHaveAttribute('aria-current', 'page');
    expect(trail().queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows Settings / Profile and Admin / Users', () => {
    const { unmount } = renderAt('/settings');
    expect(trail().getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(trail().getByText('Profile')).toHaveAttribute('aria-current', 'page');
    unmount();

    renderAt('/admin');
    expect(trail().getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(trail().getByText('Users')).toHaveAttribute('aria-current', 'page');
  });

  it('shows nothing for an address that is not a page of the menu', () => {
    renderAt('/nowhere');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('has a link to the level above that goes there when it is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <BreadcrumbProvider>
          <Breadcrumbs />
          <Routes>
            <Route path="/" element={<p>the dashboard page</p>} />
            <Route path="*" element={<p>another page</p>} />
          </Routes>
        </BreadcrumbProvider>
      </MemoryRouter>
    );

    await user.click(trail().getByRole('link', { name: 'Dashboard' }));
    expect(screen.getByText('the dashboard page')).toBeInTheDocument();
  });

  it('adds the level a page opened on top of itself, and its page item closes it instead of navigating', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    function Page() {
      useBreadcrumbDetail('breadcrumb.transactionDetails', onBack);
      return null;
    }
    renderAt('/transactions?month=2026-10', <Page />);

    expect(trail().getAllByRole('listitem')).toHaveLength(3);
    expect(trail().getByText('Transaction details')).toHaveAttribute('aria-current', 'page');

    await user.click(trail().getByRole('link', { name: 'Transactions' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not need a router (a part of a page tested alone)', () => {
    const { container } = render(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });
});
