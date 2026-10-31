import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isCommandKey, shouldIgnoreHotkey, useCommandKey, useHotkeys } from './useHotkeys.js';

// A fake keydown with only the fields the filter reads
const key = (overrides = {}) => ({
  key: 'n',
  target: document.body,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  isComposing: false,
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shouldIgnoreHotkey', () => {
  it('lets a plain key on the page through', () => {
    expect(shouldIgnoreHotkey(key())).toBe(false);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('ignores a key typed in a %s', (tagName) => {
    expect(shouldIgnoreHotkey(key({ target: document.createElement(tagName) }))).toBe(true);
  });

  it('ignores a key typed in an editable element', () => {
    expect(shouldIgnoreHotkey(key({ target: { tagName: 'DIV', isContentEditable: true } }))).toBe(true);
  });

  it('ignores Ctrl, Cmd and Alt combinations', () => {
    expect(shouldIgnoreHotkey(key({ ctrlKey: true }))).toBe(true);
    expect(shouldIgnoreHotkey(key({ metaKey: true }))).toBe(true);
    expect(shouldIgnoreHotkey(key({ altKey: true }))).toBe(true);
  });

  it('ignores a key that was already handled, or typed with an input method', () => {
    expect(shouldIgnoreHotkey(key({ defaultPrevented: true }))).toBe(true);
    expect(shouldIgnoreHotkey(key({ isComposing: true }))).toBe(true);
  });

  it('ignores keys while a dialog is open', () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    expect(shouldIgnoreHotkey(key())).toBe(true);
  });

  it('a dialog that is not open does not block', () => {
    document.body.append(document.createElement('dialog'));
    expect(shouldIgnoreHotkey(key())).toBe(false);
  });
});

describe('isCommandKey', () => {
  it('is Ctrl+K and Cmd+K, in either case', () => {
    expect(isCommandKey(key({ key: 'k', ctrlKey: true }))).toBe(true);
    expect(isCommandKey(key({ key: 'K', metaKey: true }))).toBe(true);
  });

  it('is not K alone, another letter, or with more modifiers', () => {
    expect(isCommandKey(key({ key: 'k' }))).toBe(false);
    expect(isCommandKey(key({ key: 'j', ctrlKey: true }))).toBe(false);
    expect(isCommandKey(key({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false);
    expect(isCommandKey(key({ key: 'k', ctrlKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('useCommandKey', () => {
  function Page({ onCommand }) {
    useCommandKey(onCommand);
    return <input aria-label="field" />;
  }

  it('works also while typing in a field, and the browser is told not to act', async () => {
    const onCommand = vi.fn();
    const { getByLabelText } = render(<Page onCommand={onCommand} />);
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });

    getByLabelText('field').dispatchEvent(event);

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves other keys alone', async () => {
    const onCommand = vi.fn();
    render(<Page onCommand={onCommand} />);
    await userEvent.keyboard('k');
    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe('useHotkeys', () => {
  function Page({ handlers }) {
    useHotkeys(handlers);
    return (
      <div>
        <input aria-label="box" />
        <button type="button">btn</button>
      </div>
    );
  }

  it('calls the handler of the key pressed, in either case', async () => {
    const onN = vi.fn();
    const onSlash = vi.fn();
    const user = userEvent.setup();
    render(<Page handlers={{ n: onN, '/': onSlash }} />);

    await user.keyboard('n');
    await user.keyboard('N');
    await user.keyboard('/');
    expect(onN).toHaveBeenCalledTimes(2);
    expect(onSlash).toHaveBeenCalledTimes(1);
  });

  it('calls the handler of "?"', async () => {
    const onHelp = vi.fn();
    const user = userEvent.setup();
    render(<Page handlers={{ '?': onHelp }} />);
    await user.keyboard('?');
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('does nothing while typing in a field', async () => {
    const onN = vi.fn();
    const user = userEvent.setup();
    const { getByLabelText } = render(<Page handlers={{ n: onN }} />);
    await user.click(getByLabelText('box'));
    await user.keyboard('no');
    expect(onN).not.toHaveBeenCalled();
    expect(getByLabelText('box')).toHaveValue('no');
  });

  it('does nothing for a key without a handler', async () => {
    const onN = vi.fn();
    const user = userEvent.setup();
    render(<Page handlers={{ n: onN }} />);
    await user.keyboard('x');
    expect(onN).not.toHaveBeenCalled();
  });

  it('uses the newest handler after a re-render', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Page handlers={{ n: first }} />);
    rerender(<Page handlers={{ n: second }} />);
    await user.keyboard('n');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the page is gone', async () => {
    const onN = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Page handlers={{ n: onN }} />);
    unmount();
    await user.keyboard('n');
    expect(onN).not.toHaveBeenCalled();
  });
});
