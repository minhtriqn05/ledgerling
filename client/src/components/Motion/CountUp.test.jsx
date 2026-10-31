import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountUp from './CountUp.jsx';

// The unit tests run with prefers-reduced-motion (see test/setup.js)
describe('CountUp with prefers-reduced-motion', () => {
  const format = (value) => `${value} ₫`;

  it('shows the final number at once', () => {
    render(
      <p>
        <CountUp value={1250000} format={format} />
      </p>
    );
    expect(screen.getByText('1250000 ₫')).toBeInTheDocument();
  });

  it('follows a new value', () => {
    const { rerender } = render(<CountUp value={100} format={format} />);
    rerender(<CountUp value={200} format={format} />);
    expect(screen.getByText('200 ₫')).toBeInTheDocument();
  });
});
