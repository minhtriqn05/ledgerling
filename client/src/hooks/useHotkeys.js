import { useEffect, useRef } from 'react';

// True when a shortcut key must be ignored: the user is typing, holds a modifier, or a dialog is open.
//   - typing: in an <input>, <textarea>, <select> or an editable element, "n" is just a letter
//   - Ctrl / Cmd / Alt: those combinations belong to the browser ("?" and "/" need Shift on some keyboards, so Shift is fine)
//   - an open <dialog>: the page behind a dialog must not react
export function shouldIgnoreHotkey(event, doc = document) {
  if (event.defaultPrevented || event.isComposing) return true;
  if (event.ctrlKey || event.metaKey || event.altKey) return true;

  const target = event.target;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return true;

  return Boolean(doc.querySelector('dialog[open]'));
}

// Ctrl+K, or Cmd+K on a Mac
export function isCommandKey(event) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

// Calls handler() on Ctrl+K / Cmd+K, wherever the focus is. The browser has its own use for those keys, so it is told not to act.
export function useCommandKey(handler) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (!isCommandKey(event)) return;
      event.preventDefault();
      latest.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// Calls handlers[key](event) when that key is pressed outside an input and no dialog is open.
//   useHotkeys({ n: openQuickAdd, '/': focusSearch, '?': showShortcuts });
// Keys are compared as typed ("n" and "N" are the same letter; "?" and "/" are what the key types).
export function useHotkeys(handlers) {
  // The newest handlers are used without re-adding the listener on every render
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      if (shouldIgnoreHotkey(event)) return;
      const handler = latest.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault(); // "/" must not be typed into the box it focuses
      handler(event);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
