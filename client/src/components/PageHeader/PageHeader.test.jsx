import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from './PageHeader.jsx';
import { HeroStat, HeroStats } from './HeroStat.jsx';

describe('PageHeader', () => {
  it('has the title as the one big heading, and becomes the text of the browser tab', () => {
    render(<PageHeader title="Budgets" subtitle="November 2026" eyebrow="Good morning" />);
    expect(screen.getByRole('heading', { name: 'Budgets', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('Good morning')).toBeInTheDocument();
    expect(document.title).toContain('Budgets');
  });

  it('shows the logo only when it is asked for', () => {
    const { rerender } = render(<PageHeader title="Dashboard" />);
    expect(screen.queryByRole('img', { name: 'Ledgerling' })).not.toBeInTheDocument();

    rerender(<PageHeader title="Dashboard" logo />);
    expect(screen.getByRole('img', { name: 'Ledgerling' })).toBeInTheDocument();
  });

  it('documentTitle names a part of the page instead', () => {
    render(<PageHeader title="Settings" documentTitle="Profile" />);
    expect(document.title).toContain('Profile');
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
  });

  it('shows the actions and the numbers it is given, and nothing empty without them', () => {
    const { rerender, container } = render(<PageHeader title="Goals" />);
    expect(container.querySelector('button')).toBeNull();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    rerender(
      <PageHeader
        title="Goals"
        stats={
          <HeroStats label="Totals">
            <HeroStat label="Saved" value="100 ₫" testId="saved" />
          </HeroStats>
        }
      >
        <button type="button">New goal</button>
      </PageHeader>
    );
    expect(screen.getByRole('button', { name: 'New goal' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Totals' })).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent('100 ₫');
  });

  it('is marked dark in both themes, so everything inside gets the Noir colors', () => {
    const { container } = render(<PageHeader title="Goals" />);
    expect(container.querySelector('header')).toHaveAttribute('data-tone', 'noir');
  });
});
