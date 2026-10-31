import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoredBoolean } from './useStoredBoolean.js';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useStoredBoolean', () => {
  it('starts with the fallback when nothing is stored', () => {
    expect(renderHook(() => useStoredBoolean('a')).result.current[0]).toBe(false);
    expect(renderHook(() => useStoredBoolean('a', true)).result.current[0]).toBe(true);
  });

  it('stores a new value, and a new render of the page reads it back', () => {
    const first = renderHook(() => useStoredBoolean('a'));
    act(() => first.result.current[1](true));
    expect(first.result.current[0]).toBe(true);
    expect(localStorage.getItem('a')).toBe('1');

    expect(renderHook(() => useStoredBoolean('a')).result.current[0]).toBe(true);
  });

  it('takes a function of the old value', () => {
    const { result } = renderHook(() => useStoredBoolean('a'));
    act(() => result.current[1]((value) => !value));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]((value) => !value));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('a')).toBe('0');
  });

  it('keeps every key apart', () => {
    const one = renderHook(() => useStoredBoolean('one'));
    act(() => one.result.current[1](true));
    expect(renderHook(() => useStoredBoolean('two')).result.current[0]).toBe(false);
  });

  it('still works when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useStoredBoolean('a'));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
});
