import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useReducedMotion } from 'motion/react';
import Logo from './Logo.jsx';

// Unit tests run with reduced motion (src/test/setup.js). The toss needs both settings, so this file chooses for itself.
vi.mock('motion/react', () => ({ useReducedMotion: vi.fn() }));

describe('Logo', () => {
  beforeEach(() => {
    useReducedMotion.mockReturnValue(false);
  });

  it('is one picture named Ledgerling for a screen reader', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'Ledgerling' })).toBeInTheDocument();
  });

  it('is made of four equal L, a quarter turn apart, with each one opposite its twin', () => {
    const { container } = render(<Logo />);
    const front = container.querySelectorAll('svg')[2];
    const pieces = [...front.querySelectorAll('[data-piece]')];

    expect(pieces.map((piece) => piece.dataset.piece).sort()).toEqual(['0', '180', '270', '90']);
    expect(new Set(pieces.map((piece) => piece.querySelector('path').getAttribute('d'))).size).toBe(1);
    pieces.forEach((piece) => {
      expect(piece.parentElement.getAttribute('transform')).toBe(`rotate(${piece.dataset.piece} 32 32)`);
    });

    const tone = (angle) => front.querySelector(`[data-piece="${angle}"]`).dataset.tone;
    expect(tone(0)).toBe(tone(180));
    expect(tone(90)).toBe(tone(270));
    expect(tone(0)).not.toBe(tone(90));
  });

  it('draws the jade over the gold, so all four seams look the same', () => {
    const { container } = render(<Logo />);
    const tones = [...container.querySelectorAll('svg')[2].querySelectorAll('[data-piece]')].map((piece) => piece.dataset.tone);
    expect(tones).toEqual(['gold', 'gold', 'jade', 'jade']);
  });

  it('gives every instance its own gradients, so two logos on a page do not share them', () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient, radialGradient, clipPath')].map((node) => node.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('a press tosses the coin once, and the toss ends with its animation', () => {
    const { container } = render(<Logo />);
    const coin = screen.getByTestId('logo-coin');
    expect(container.querySelector('[data-tossing]')).toBeNull();

    fireEvent.pointerDown(screen.getByRole('img', { name: 'Ledgerling' }));
    expect(container.querySelector('[data-tossing]')).not.toBeNull();

    // jsdom has no AnimationEvent, so React listens for the prefixed name of the event here
    const animationEnds = (node) => fireEvent(node, new Event('webkitAnimationEnd', { bubbles: true }));

    // An animation that ends inside the coin must not stop the toss
    animationEnds(coin.firstElementChild);
    expect(container.querySelector('[data-tossing]')).not.toBeNull();

    animationEnds(coin);
    expect(container.querySelector('[data-tossing]')).toBeNull();
  });

  it('with reduced motion a press does nothing', () => {
    useReducedMotion.mockReturnValue(true);
    const { container } = render(<Logo />);

    fireEvent.pointerDown(screen.getByRole('img', { name: 'Ledgerling' }));
    expect(container.querySelector('[data-tossing]')).toBeNull();
  });

  it('showName={false} gives the mark alone', () => {
    const { container, rerender } = render(<Logo size={40} />);
    expect(container.querySelectorAll('svg')).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Ledgerling' }).style.getPropertyValue('--logo-size')).toBe('40px');

    rerender(<Logo size={40} showName={false} />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
  });
});
