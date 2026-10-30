import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { UNDO_MS, useUndoDelete } from './useUndoDelete.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useUndoDelete', () => {
  it('hides the item at once and does not call the API yet', () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useUndoDelete(deleteItem));

    act(() => result.current.remove('a'));
    expect(result.current.hiddenIds.has('a')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(UNDO_MS - 1);
    });
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('calls the API after 5 seconds, then reports it', async () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const onDone = vi.fn();
    const { result } = renderHook(() => useUndoDelete(deleteItem, { onDone }));

    act(() => result.current.remove('a'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });

    expect(deleteItem).toHaveBeenCalledWith('a');
    expect(onDone).toHaveBeenCalledWith('a');
    // The page has removed the item itself by now, so it is not hidden any more
    expect(result.current.hiddenIds.has('a')).toBe(false);
  });

  it('uses 5 seconds', () => {
    expect(UNDO_MS).toBe(5000);
  });

  it('Undo shows the item again and the API is never called', async () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useUndoDelete(deleteItem));

    act(() => result.current.remove('a'));
    act(() => result.current.undo('a'));
    expect(result.current.hiddenIds.has('a')).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS * 2);
    });
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('shows the item again and reports the error when the delete fails', async () => {
    const error = new Error('boom');
    const deleteItem = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const onDone = vi.fn();
    const { result } = renderHook(() => useUndoDelete(deleteItem, { onError, onDone }));

    act(() => result.current.remove('a'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });

    expect(onError).toHaveBeenCalledWith(error, 'a');
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.hiddenIds.has('a')).toBe(false);
  });

  it('counts down each item on its own', async () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useUndoDelete(deleteItem));

    act(() => result.current.remove('a'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    act(() => result.current.remove('b'));
    expect([...result.current.hiddenIds].sort()).toEqual(['a', 'b']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000); // a is due, b is not
    });
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith('a');

    act(() => result.current.undo('b'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(deleteItem).toHaveBeenCalledTimes(1);
  });

  it('removing the same item twice starts one countdown', async () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useUndoDelete(deleteItem));

    act(() => result.current.remove('a'));
    act(() => result.current.remove('a'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS);
    });
    expect(deleteItem).toHaveBeenCalledTimes(1);
  });

  it('deletes what is still waiting when the page is left', () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { result, unmount } = renderHook(() => useUndoDelete(deleteItem));

    act(() => result.current.remove('a'));
    act(() => result.current.remove('b'));
    act(() => result.current.undo('b')); // b was undone: it must stay
    unmount();

    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith('a');

    // and the timer of the removed item does not fire a second time
    vi.advanceTimersByTime(UNDO_MS * 2);
    expect(deleteItem).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing on unmount when nothing is waiting', () => {
    const deleteItem = vi.fn().mockResolvedValue({});
    const { unmount } = renderHook(() => useUndoDelete(deleteItem));
    unmount();
    expect(deleteItem).not.toHaveBeenCalled();
  });

  it('does not fail on unmount when the API call fails', () => {
    const deleteItem = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, unmount } = renderHook(() => useUndoDelete(deleteItem));
    act(() => result.current.remove('a'));
    expect(() => unmount()).not.toThrow();
  });
});
