import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLoad } from './useLoad.js';

async function loaded(loader) {
  const view = renderHook(() => useLoad(loader, []));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useLoad', () => {
  it('reload() shows the loading state again', async () => {
    const loader = vi.fn().mockResolvedValue('data');
    const { result } = await loaded(loader);
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('refresh() replaces the data without a loading state', async () => {
    const loader = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    const { result } = await loaded(loader);
    expect(result.current.data).toBe('old');

    act(() => result.current.refresh());
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('old');
    await waitFor(() => expect(result.current.data).toBe('new'));
  });

  it('refresh() keeps the data on screen when it fails', async () => {
    const loader = vi.fn().mockResolvedValueOnce('old').mockRejectedValueOnce(new Error('no network'));
    const { result } = await loaded(loader);

    await act(async () => result.current.refresh());
    expect(loader).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('old');
    expect(result.current.error).toBe('');
  });

  it('after a refresh, reload() shows the loading state again', async () => {
    const loader = vi.fn().mockResolvedValue('data');
    const { result } = await loaded(loader);
    await act(async () => result.current.refresh());
    act(() => result.current.reload());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
