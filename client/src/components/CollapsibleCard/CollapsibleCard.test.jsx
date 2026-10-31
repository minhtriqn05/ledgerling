import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollapsibleCard from './CollapsibleCard.jsx';

function renderCard(id = 'test.card') {
  return render(
    <CollapsibleCard id={id} icon="chart" title="Cash flow" subtitle="October" actions={<button type="button">View all</button>}>
      <button type="button">Inside</button>
    </CollapsibleCard>
  );
}

const card = (container) => container.querySelector('[data-card]');

beforeEach(() => localStorage.clear());

describe('CollapsibleCard', () => {
  it('starts open, with the title, the actions and the content', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Cash flow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inside' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Cash flow' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('folds and opens with the chevron; the title stays and the content is out of reach while folded', async () => {
    const user = userEvent.setup();
    const { container } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Collapse Cash flow' }));
    expect(card(container)).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('heading', { name: 'Cash flow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Cash flow' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Inside').closest('[inert]')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand Cash flow' }));
    expect(card(container)).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByText('Inside').closest('[inert]')).toBeNull();
  });

  it('remembers the state of each card apart', async () => {
    const user = userEvent.setup();
    const first = renderCard('card.one');
    await user.click(screen.getByRole('button', { name: 'Collapse Cash flow' }));
    first.unmount();

    const again = renderCard('card.one');
    expect(card(again.container)).toHaveAttribute('data-collapsed', 'true');
    again.unmount();

    const other = renderCard('card.two');
    expect(card(other.container)).toHaveAttribute('data-collapsed', 'false');
  });
});
