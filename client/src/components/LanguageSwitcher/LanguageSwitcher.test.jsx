import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../../i18n/index.js';
import { LANGUAGE_STORAGE_KEY, LANGUAGES } from '../../i18n/languages.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

describe('LanguageSwitcher', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('lists every language in its own language', () => {
    render(<LanguageSwitcher />);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(LANGUAGES.map((l) => l.name));
    expect(screen.getByRole('option', { name: 'Tiếng Việt' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument();
    expect(screen.getByTestId('language-select')).toHaveValue('en');
  });

  it('changes the language, <html lang> and what is stored', async () => {
    render(<LanguageSwitcher />);
    await userEvent.selectOptions(screen.getByTestId('language-select'), 'de');

    expect(i18n.resolvedLanguage).toBe('de');
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
    expect(screen.getByLabelText('Sprache')).toHaveValue('de');
  });
});
