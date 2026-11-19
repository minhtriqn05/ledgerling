import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useTapAway } from './DashboardCharts.jsx';
import styles from './DashboardCharts.module.css';

// A chart with the hook: `card` stands for the tooltip card that ChartTooltip draws while a tooltip is shown
let renders = 0;
function Chart({ card = false }) {
  const [ref, active] = useTapAway();
  renders += 1;
  return (
    <div>
      <div ref={ref} data-testid="chart">
        {card && <div className={styles.tooltip}>card</div>}
      </div>
      <p data-testid="state">{String(active)}</p>
      <button type="button">outside</button>
    </div>
  );
}

function touch(target, pointerType = 'touch') {
  const event = new Event('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

describe('useTapAway', () => {
  it('lets Recharts decide at first (hover with a mouse, touch with a finger)', () => {
    render(<Chart />);
    expect(screen.getByTestId('state')).toHaveTextContent('undefined');
  });

  it('does not draw the chart again for a touch outside while no card is shown', () => {
    render(<Chart />);
    const before = renders;
    touch(screen.getByRole('button', { name: 'outside' }));
    touch(document.body);
    expect(renders).toBe(before);
    expect(screen.getByTestId('state')).toHaveTextContent('undefined');
  });

  it('hides a shown card with the next touch outside the chart, and shows it again with a touch on the chart', () => {
    const { rerender } = render(<Chart card />);
    touch(screen.getByRole('button', { name: 'outside' }));
    expect(screen.getByTestId('state')).toHaveTextContent('false');
    // hidden: ChartTooltip draws no card any more; further touches outside change nothing
    rerender(<Chart />);
    const before = renders;
    touch(document.body);
    expect(renders).toBe(before);
    touch(screen.getByTestId('chart'));
    expect(screen.getByTestId('state')).toHaveTextContent('undefined');
  });

  it('leaves the mouse to Recharts (it handles the mouse leaving the chart)', () => {
    render(<Chart card />);
    touch(screen.getByRole('button', { name: 'outside' }), 'mouse');
    expect(screen.getByTestId('state')).toHaveTextContent('undefined');
  });
});
