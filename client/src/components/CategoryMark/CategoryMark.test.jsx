import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryMark from './CategoryMark.jsx';

describe('CategoryMark', () => {
  it.each([
    ['an icon name', { name: 'Food', color: '#F07D62', icon: 'utensils' }],
    ['no icon: guessed from the name', { name: 'Food', color: '#F07D62', icon: null }],
    ['no icon and no hint: the generic icon', { name: 'Zzz', color: '#F07D62' }],
    ['an emoji of the old picker: its line icon', { name: 'Food', color: '#F07D62', icon: '🍜' }],
  ])('draws a line icon and no text for %s', (_, category) => {
    render(<CategoryMark category={category} />);
    const mark = screen.getByTestId('category-mark');
    expect(mark.querySelector('svg')).toBeInTheDocument();
    expect(mark).toHaveTextContent('');
  });

  it('keeps an emoji that has no line icon', () => {
    render(<CategoryMark category={{ name: 'Fun', color: '#F07D62', icon: '🦄' }} />);
    expect(screen.getByTestId('category-mark')).toHaveTextContent('🦄');
  });

  it('takes the color of the category, and is hidden from screen readers', () => {
    render(<CategoryMark category={{ name: 'Food', color: '#F07D62' }} />);
    const mark = screen.getByTestId('category-mark');
    expect(mark.style.getPropertyValue('--tone')).toBe('#F07D62');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });
});
