import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRestoreFocus } from './useRestoreFocus.js';

function Panel() {
  useRestoreFocus();
  return <input aria-label="Inside" autoFocus />;
}

function Page({ open }) {
  return (
    <>
      <button type="button">Open</button>
      {open && <Panel />}
    </>
  );
}

describe('useRestoreFocus', () => {
  it('gives the focus back to the element that had it when the panel appeared', () => {
    const { rerender } = render(<Page open={false} />);
    screen.getByRole('button', { name: 'Open' }).focus();

    rerender(<Page open />);
    expect(screen.getByLabelText('Inside')).toHaveFocus();

    rerender(<Page open={false} />);
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('does nothing when that element is gone by then', () => {
    function Gone({ step }) {
      return (
        <>
          {step === 0 && <button type="button">Temporary</button>}
          {step === 1 && <Panel />}
        </>
      );
    }
    const { rerender } = render(<Gone step={0} />);
    screen.getByRole('button', { name: 'Temporary' }).focus();
    rerender(<Gone step={1} />);
    rerender(<Gone step={2} />);
    expect(document.body).toHaveFocus();
  });
});
