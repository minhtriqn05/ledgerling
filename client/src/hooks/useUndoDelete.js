import { useCallback, useEffect, useRef, useState } from 'react';

export const UNDO_MS = 5000; // how long "Undo" is offered before the delete is really sent

// Delete with Undo. The item is hidden at once, but the API is called only when the time is up without an Undo.
//   const undoDelete = useUndoDelete((id) => deleteTransaction(id), { onDone, onError });
//   undoDelete.remove(id)    hide the item and start the countdown
//   undoDelete.undo(id)      stop the countdown and show the item again
//   undoDelete.hiddenIds     a Set of the ids to leave out of the list
// - onDone(id) runs after the API said OK (the page takes the item out of its own list there).
// - onError(error, id) runs when the delete failed; the item is shown again.
// If the page is left while something is waiting, it is deleted right away (the user did ask for it).
// Closing the tab or pressing F5 inside the countdown sends nothing, so the item stays: the safe side.
export function useUndoDelete(deleteItem, { delay = UNDO_MS, onDone, onError } = {}) {
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const timers = useRef(new Map()); // id -> timer, only for items still in the countdown

  // The latest callbacks, so a timer started earlier never calls an old version of them
  const latest = useRef({ deleteItem, onDone, onError });
  useEffect(() => {
    latest.current = { deleteItem, onDone, onError };
  });

  const show = useCallback((id) => {
    setHiddenIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }, []);

  const commit = useCallback(
    async (id) => {
      timers.current.delete(id);
      try {
        await latest.current.deleteItem(id);
        latest.current.onDone?.(id);
      } catch (error) {
        latest.current.onError?.(error, id);
      } finally {
        show(id);
      }
    },
    [show]
  );

  const remove = useCallback(
    (id) => {
      if (timers.current.has(id)) return; // already counting down
      setHiddenIds((ids) => new Set(ids).add(id));
      timers.current.set(
        id,
        setTimeout(() => commit(id), delay)
      );
    },
    [commit, delay]
  );

  const undo = useCallback(
    (id) => {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      show(id);
    },
    [show]
  );

  // Leaving the page: whatever is still waiting is deleted now. No state is touched, the page is gone.
  useEffect(() => {
    const waiting = timers.current;
    return () => {
      for (const [id, timer] of waiting) {
        clearTimeout(timer);
        Promise.resolve(latest.current.deleteItem(id)).catch(() => {});
      }
      waiting.clear();
    };
  }, []);

  return { hiddenIds, remove, undo };
}
