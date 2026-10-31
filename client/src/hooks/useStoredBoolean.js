import { useCallback, useState } from 'react';

// A yes/no remembered on this device: the collapsed sidebar, a collapsed card, "the tour was seen".
// Stored as '1' or '0'. Without localStorage (private mode, blocked storage) it still works until the page is closed.
function read(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === '1';
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Nothing to do: the value simply does not survive a reload
  }
}

// const [collapsed, setCollapsed] = useStoredBoolean('ledgerling.sidebarCollapsed');
// setCollapsed takes a value or a function of the old value, like useState.
export function useStoredBoolean(key, fallback = false) {
  const [value, setValue] = useState(() => read(key, fallback));

  const update = useCallback(
    (next) => {
      setValue((current) => {
        const result = typeof next === 'function' ? next(current) : next;
        write(key, result);
        return result;
      });
    },
    [key]
  );

  return [value, update];
}
