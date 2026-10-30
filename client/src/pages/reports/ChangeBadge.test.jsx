import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChangeBadge from './ChangeBadge.jsx';

describe('ChangeBadge', () => {
  it('says "No data last month" when the percent is null', () => {
    render(<ChangeBadge percent={null} kind="expense" />);

    expect(screen.getAllByText('No data last month').length).toBeGreaterThan(0);
  });

  it('shows more expense as a red upward change, with the words for screen readers', () => {
    const { container } = render(<ChangeBadge percent={13.6} kind="expense" />);

    expect(screen.getByText('Up 13.6% from last month')).toBeInTheDocument();
    expect(container.firstChild.className).toMatch(/bad/);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows more income as a green upward change', () => {
    const { container } = render(<ChangeBadge percent={19.4} kind="income" />);

    expect(screen.getByText('Up 19.4% from last month')).toBeInTheDocument();
    expect(container.firstChild.className).toMatch(/good/);
  });

  it('shows less expense as a green downward change', () => {
    const { container } = render(<ChangeBadge percent={-20} kind="expense" />);

    expect(screen.getByText('Down 20% from last month')).toBeInTheDocument();
    expect(container.firstChild.className).toMatch(/good/);
  });

  it('shows 0% as neutral without an arrow', () => {
    const { container } = render(<ChangeBadge percent={0} kind="expense" />);

    expect(screen.getByText('No change from last month')).toBeInTheDocument();
    expect(container.firstChild.className).toMatch(/neutral/);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
