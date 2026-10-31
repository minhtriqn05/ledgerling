import { describe, expect, it } from 'vitest';
import { avatarTone, initialOf } from './avatar.js';

describe('initialOf', () => {
  it('is the first letter in upper case', () => {
    expect(initialOf('minh tri')).toBe('M');
    expect(initialOf('  Nguyễn Minh Trí ')).toBe('N');
  });

  it('keeps an accented, non-Latin or emoji first character whole', () => {
    expect(initialOf('étienne')).toBe('É');
    expect(initialOf('山田')).toBe('山');
    expect(initialOf('😀 Smile')).toBe('😀');
  });

  it('gives ? when there is no name', () => {
    expect(initialOf('')).toBe('?');
    expect(initialOf('   ')).toBe('?');
    expect(initialOf(undefined)).toBe('?');
  });
});

describe('avatarTone', () => {
  it('always gives the same color for the same name, whatever the case or spaces', () => {
    expect(avatarTone('Minh Tri')).toBe(avatarTone('  minh tri '));
  });

  it('gives one of the accent colors', () => {
    for (const name of ['A', 'Bob', 'Minh Tri', '山田', '']) {
      expect(['sky', 'coral', 'teal', 'sun', 'periwinkle', 'mint']).toContain(avatarTone(name));
    }
  });

  it('does not give every name the same color', () => {
    const tones = new Set(['Anna', 'Bob', 'Carl', 'Dana', 'Erik', 'Fay'].map(avatarTone));
    expect(tones.size).toBeGreaterThan(1);
  });
});
