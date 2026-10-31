import { describe, expect, it } from 'vitest';
import { passwordStrength } from './passwordStrength.js';

describe('passwordStrength', () => {
  it('has no level for an empty password', () => {
    expect(passwordStrength('')).toEqual({ level: null, score: 0 });
  });

  it('is weak under 8 characters, even with every kind of character', () => {
    expect(passwordStrength('a')).toMatchObject({ level: 'weak', score: 1 });
    expect(passwordStrength('Ab1!xyz')).toMatchObject({ level: 'weak' });
  });

  it('is weak for 8 characters of one kind or two kinds', () => {
    expect(passwordStrength('12345678').level).toBe('weak');
    expect(passwordStrength('password').level).toBe('weak');
    expect(passwordStrength('password1').level).toBe('weak');
  });

  it('is medium for a mix of three kinds, or a long password of two kinds', () => {
    expect(passwordStrength('Password1')).toMatchObject({ level: 'medium', score: 2 });
    expect(passwordStrength('correcthorsebattery').level).toBe('medium'); // 19 letters of one kind
    expect(passwordStrength('longpassword12').level).toBe('medium');
  });

  it('is strong for 12 characters with three kinds, or for 16 or more with two', () => {
    expect(passwordStrength('Password123!')).toMatchObject({ level: 'strong', score: 3 });
    expect(passwordStrength('correct horse battery')).toMatchObject({ level: 'strong' });
  });

  it('counts a space or a symbol as its own kind of character', () => {
    // 8 characters of four kinds is medium; the same 8 characters of one kind is weak
    expect(passwordStrength('Abc-1234').level).toBe('medium');
    expect(passwordStrength('abcdefgh').level).toBe('weak');
    // a space is a kind of its own: "abc def ghi" has two kinds and 11 characters, one point short of medium
    expect(passwordStrength('abc def ghi').level).toBe('weak');
    expect(passwordStrength('abc def ghij').level).toBe('medium');
  });
});
