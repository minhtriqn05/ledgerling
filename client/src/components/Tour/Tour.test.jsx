import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Tour from './Tour.jsx';

// Two elements of the tour where AppLayout would have them: the + button at the bottom right, Dashboard at the top left.
// jsdom draws nothing, so each one says where it is (the window is 1024 x 768).
const RECTS = {
  'quick-add': { top: 700, left: 960, right: 1004, bottom: 744, width: 44, height: 44 },
  'nav:/': { top: 100, left: 20, right: 260, bottom: 140, width: 240, height: 40 },
};

function addTargets() {
  for (const [target, rect] of Object.entries(RECTS)) {
    const element = document.createElement('button');
    element.dataset.tour = target;
    element.getBoundingClientRect = () => rect;
    document.body.appendChild(element);
  }
}

const card = (title) => screen.getByRole('heading', { name: title }).parentElement;

// Like a browser, an element inside a closed <dialog> has no size (display: none); the card is 340 x 180 once it is open
const sizes = { offsetWidth: 340, offsetHeight: 180 };
const realSizes = Object.fromEntries(Object.keys(sizes).map((key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)]));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
  for (const [key, size] of Object.entries(sizes)) {
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get() {
        return this.closest('dialog')?.open ? size : 0;
      },
    });
  }
  addTargets();
});
afterEach(() => {
  document.querySelectorAll('[data-tour]').forEach((element) => element.remove());
  for (const [key, descriptor] of Object.entries(realSizes)) Object.defineProperty(HTMLElement.prototype, key, descriptor);
});

describe('Tour', () => {
  it('puts the card next to the element of each new step at once, never where the last step had it', async () => {
    render(<Tour onClose={vi.fn()} onStepChange={vi.fn()} menuOpen={false} />);
    // Step 1: on the left of the + button (no room on its right), measured with its real size, inside the window
    await waitFor(() => expect(card('Quick add')).toHaveStyle({ top: '576px', left: '604px' }));

    // Straight after the click, with no frame in between: a click that follows at once must find Back where it shows
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(card('Dashboard')).toHaveStyle({ top: '30px', left: '276px' });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(card('Quick add')).toHaveStyle({ top: '576px', left: '604px' });
  });

  it('tells the layout which step is shown, keeps the focus on the main button and ends with Skip', () => {
    const onClose = vi.fn();
    const onStepChange = vi.fn();
    render(<Tour onClose={onClose} onStepChange={onStepChange} menuOpen={false} />);

    expect(onStepChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'quickAdd' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStepChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'dashboard', inMenu: true }));
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
