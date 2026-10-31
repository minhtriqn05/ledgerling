import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n/index.js';
import { getErrorMessage, translateApiError } from './axios.js';

// What axios throws when the API answers with an error
const apiError = (data) => ({ response: { data } });

describe('getErrorMessage', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('translates by code, not by the English message', async () => {
    const error = apiError({ success: false, message: 'Email is already registered', code: 'EMAIL_TAKEN' });
    expect(getErrorMessage(error)).toBe('Email is already registered');

    await i18n.changeLanguage('vi');
    expect(getErrorMessage(error)).toBe('Email này đã được đăng ký');

    await i18n.changeLanguage('ja');
    expect(getErrorMessage(error)).toBe('このメールアドレスはすでに登録されています');
  });

  it('shows the message of the API when there is no code, or an unknown one', async () => {
    await i18n.changeLanguage('de');
    expect(getErrorMessage(apiError({ success: false, message: 'Old server text' }))).toBe('Old server text');
    expect(getErrorMessage(apiError({ success: false, message: 'New text', code: 'NOT_KNOWN_YET' }))).toBe('New text');
  });

  it('has its own text without a message, and when the server cannot be reached', async () => {
    expect(getErrorMessage(apiError(undefined))).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage({})).toBe('Cannot reach the server. Please try again.');

    await i18n.changeLanguage('de');
    expect(getErrorMessage({})).toBe('Der Server ist nicht erreichbar. Bitte versuche es erneut.');
  });
});

describe('translateApiError', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('fills in the params of an import row', async () => {
    const row = { code: 'IMPORT_CATEGORY_NOT_FOUND', message: 'x', params: { name: 'Pets', type: 'expense' } };
    expect(translateApiError(row)).toBe('Category "Pets" (expense) not found');

    await i18n.changeLanguage('fr');
    expect(translateApiError(row)).toBe('Catégorie « Pets » (expense) introuvable');
  });
});
