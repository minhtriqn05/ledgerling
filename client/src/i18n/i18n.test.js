import { describe, expect, it } from 'vitest';
import i18n, { languageBackend } from './index.js';
import { LANGUAGES } from './languages.js';

// English is in the main file of the build; every other language is its own file, downloaded the first time it is used.

describe('loading a language on demand', () => {
  it('reads the file of a language, with the same keys as English', async () => {
    const korean = await new Promise((resolve, reject) =>
      languageBackend.read('ko', 'translation', (err, data) => (err ? reject(err) : resolve(data)))
    );
    expect(Object.keys(korean)).toEqual(Object.keys(i18n.getResourceBundle('en', 'translation')));
    expect(korean.nav.dashboard).not.toBe(i18n.getResourceBundle('en', 'translation').nav.dashboard);
  });

  it('answers an error for a language the app does not have', async () => {
    const error = await new Promise((resolve) => languageBackend.read('xx', 'translation', (err) => resolve(err)));
    expect(error).toBeInstanceOf(Error);
  });

  it('has a file for every language of the picker', () => {
    expect(LANGUAGES.map((language) => languageBackend.has(language.code))).toEqual(LANGUAGES.map(() => true));
  });

  it('switches to a language once its file is there', async () => {
    await i18n.changeLanguage('ja');
    expect(i18n.resolvedLanguage).toBe('ja');
    expect(i18n.t('nav.dashboard')).toBe(i18n.getResourceBundle('ja', 'translation').nav.dashboard);
    expect(document.documentElement.lang).toBe('ja');
    await i18n.changeLanguage('en');
  });
});
