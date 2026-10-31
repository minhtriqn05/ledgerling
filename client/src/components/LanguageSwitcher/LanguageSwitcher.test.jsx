import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../../i18n/index.js';
import { LANGUAGE_STORAGE_KEY, LANGUAGES } from '../../i18n/languages.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';

describe('LanguageSwitcher', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('lists every language in its own language', async () => {
    render(<LanguageSwitcher />);
    const picker = screen.getByRole('combobox', { name: 'Language' });
    expect(picker).toHaveTextContent('English');
    expect(picker).toHaveValue('en');

    await userEvent.click(picker);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(LANGUAGES.map((l) => l.name));
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: '日本語' })).toHaveAttribute('lang', 'ja');
  });

  it('changes the language, <html lang> and what is stored', async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByTestId('language-select'));
    await userEvent.click(screen.getByRole('option', { name: 'Deutsch' }));

    expect(i18n.resolvedLanguage).toBe('de');
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
    expect(screen.getByRole('combobox', { name: 'Sprache' })).toHaveTextContent('Deutsch');
  });

  it('works with the keyboard: arrows move, Enter picks, Escape closes', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    const picker = screen.getByRole('combobox', { name: 'Language' });

    picker.focus();
    await user.keyboard('{ArrowDown}');
    expect(picker).toHaveAttribute('aria-expanded', 'true');
    expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'English' }).id);

    await user.keyboard('{ArrowDown}');
    expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Tiếng Việt' }).id);
    await user.keyboard('{Escape}');
    expect(picker).toHaveAttribute('aria-expanded', 'false');
    expect(i18n.resolvedLanguage).toBe('en');

    // Typing a letter jumps to the language that starts with it
    await user.keyboard('f');
    expect(picker).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Français' }).id);
    await user.keyboard('{Enter}');
    expect(i18n.resolvedLanguage).toBe('fr');
    expect(picker).toHaveAttribute('aria-expanded', 'false');
  });
});
