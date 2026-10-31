import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import i18n from '../i18n/index.js';
import api, { getErrorMessage, translateApiError } from './axios.js';
import { getActiveRequests } from '../utils/requestTracker.js';
import { SESSION_EXPIRED_EVENT } from '../utils/sessionEvents.js';

// What axios throws when the API answers with an error
const apiError = (data) => ({ response: { data } });

// A request that gets this status from a pretend server (a custom adapter instead of the network)
function requestWithStatus(url, status) {
  const adapter = (config) => {
    const response = { status, data: {}, headers: {}, config, statusText: '' };
    if (status < 400) return Promise.resolve(response);
    return Promise.reject(new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response));
  };
  return api.get(url, { adapter });
}

describe('a 401 from the API', () => {
  afterEach(() => localStorage.clear());

  it('drops the token and asks for the Session expired dialog, without leaving the page', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    localStorage.setItem('token', 'old');

    await expect(requestWithStatus('/budgets', 401)).rejects.toBeInstanceOf(AxiosError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('is not about the session on /auth/ (a wrong password), or with another status', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    localStorage.setItem('token', 'mine');

    await expect(requestWithStatus('/auth/login', 401)).rejects.toBeInstanceOf(AxiosError);
    await expect(requestWithStatus('/budgets', 403)).rejects.toBeInstanceOf(AxiosError);

    expect(listener).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('mine');
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});

describe('the count of requests on their way', () => {
  it('goes up while a request runs and back down after an answer or an error', async () => {
    const answer = requestWithStatus('/budgets', 200);
    expect(getActiveRequests()).toBe(0); // the interceptors run a moment later
    await answer;
    expect(getActiveRequests()).toBe(0);

    await expect(requestWithStatus('/budgets', 500)).rejects.toBeInstanceOf(AxiosError);
    expect(getActiveRequests()).toBe(0);
  });

  it('leaves out the requests the bell makes in the background', async () => {
    let during = null;
    await api.get('/notifications/unread-count', {
      adapter: (config) => {
        during = getActiveRequests();
        return Promise.resolve({ status: 200, data: {}, headers: {}, config, statusText: '' });
      },
    });
    expect(during).toBe(0);

    await api.get('/budgets', {
      adapter: (config) => {
        during = getActiveRequests();
        return Promise.resolve({ status: 200, data: {}, headers: {}, config, statusText: '' });
      },
    });
    expect(during).toBe(1);
  });
});

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
