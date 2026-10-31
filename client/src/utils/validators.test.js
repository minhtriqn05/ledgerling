import { describe, expect, it } from 'vitest';
import { isValidEmail, passwordChangeProblem } from './validators.js';

describe('isValidEmail', () => {
  it('accepts an address and ignores spaces around it', () => {
    expect(isValidEmail(' tri@example.com ')).toBe(true);
    expect(isValidEmail('tri@example')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('passwordChangeProblem', () => {
  const ok = { current: 'secret123', next: 'a-better-one', confirm: 'a-better-one' };

  it('is null for a good form', () => {
    expect(passwordChangeProblem(ok)).toBeNull();
    expect(passwordChangeProblem({ ...ok, next: '12345678', confirm: '12345678' })).toBeNull();
  });

  it('asks for the current password first', () => {
    expect(passwordChangeProblem({ ...ok, current: '' })).toBe('settings.password.enterCurrent');
  });

  it('wants at least 8 characters, and at most 72', () => {
    expect(passwordChangeProblem({ ...ok, next: '1234567', confirm: '1234567' })).toBe('settings.password.tooShort');
    expect(passwordChangeProblem({ ...ok, next: 'x'.repeat(73), confirm: 'x'.repeat(73) })).toBe('errors.PASSWORD_TOO_LONG');
  });

  it('refuses the same password as before', () => {
    expect(passwordChangeProblem({ current: 'secret123', next: 'secret123', confirm: 'secret123' })).toBe('errors.PASSWORD_UNCHANGED');
  });

  it('wants the two new passwords to be the same', () => {
    expect(passwordChangeProblem({ ...ok, confirm: 'a-better-on' })).toBe('settings.password.mismatch');
  });
});
