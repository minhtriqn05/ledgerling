import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Avatar from './Avatar.jsx';

describe('Avatar', () => {
  it('shows the first letter of the name, hidden from screen readers', () => {
    const { container } = render(<Avatar name="minh tri" />);
    const avatar = container.firstChild;

    expect(avatar).toHaveTextContent('M');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes its color from the name', () => {
    const { container, rerender } = render(<Avatar name="Anna" />);
    const first = container.firstChild.style.getPropertyValue('--tone');
    expect(first).toMatch(/^var\(--accent-(sky|coral|teal|sun|periwinkle|mint)\)$/);

    rerender(<Avatar name="Anna" />);
    expect(container.firstChild.style.getPropertyValue('--tone')).toBe(first);
  });
});
