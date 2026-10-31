import { describe, expect, it } from 'vitest';
import { CATEGORY_ICON_NAMES } from '../../../server/src/utils/categoryIcons.js';
import {
  GENERIC_ICON_NAME,
  ICON_GROUPS,
  ICON_NAMES,
  guessIconName,
  isEmojiIcon,
  resolveCategoryIcon,
  selectedIconName,
} from './categoryIcons.js';
import { EMOJI_CHOICES } from './emoji.js';

describe('the icon set', () => {
  it('has about 40 icons in named groups, none twice', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
    expect(ICON_GROUPS.map((group) => group.id)).toEqual(
      expect.arrayContaining(['food', 'transport', 'bills', 'shopping', 'entertainment', 'health', 'education', 'home', 'travel', 'income'])
    );
  });

  it('is the same list the server accepts', () => {
    expect([...ICON_NAMES].sort()).toEqual([...CATEGORY_ICON_NAMES].sort());
  });
});

describe('guessIconName', () => {
  it.each([
    ['Food', 'utensils'],
    ['Transport', 'bus'],
    ['Shopping', 'shopping-bag'],
    ['Bills', 'receipt'],
    ['Entertainment', 'clapperboard'],
    ['Salary', 'banknote'],
    ['Other Income', 'gift'],
    ['Coffee shops', 'coffee'],
    ['Lương tháng', 'banknote'],
    ['Sức khoẻ', 'heart-pulse'],
    ['Tiền điện', 'zap'],
    ['Đi chợ', 'shopping-basket'],
  ])('%s -> %s', (name, icon) => {
    expect(guessIconName(name)).toBe(icon);
  });

  it('matches the start of a word, not the middle', () => {
    expect(guessIconName('Scarf')).toBe(GENERIC_ICON_NAME);
  });

  it('uses the generic icon when the name gives no hint', () => {
    expect(guessIconName('Zzz')).toBe(GENERIC_ICON_NAME);
    expect(guessIconName('')).toBe(GENERIC_ICON_NAME);
  });
});

describe('resolveCategoryIcon', () => {
  const iconOf = (name) => ICON_GROUPS.flatMap((group) => group.icons).find((icon) => icon.name === name).Icon;

  it('uses a stored icon name, whatever the category is called', () => {
    expect(resolveCategoryIcon({ icon: 'plane', name: 'Food' })).toEqual({ Icon: iconOf('plane') });
  });

  it('guesses from the name when there is no icon', () => {
    expect(resolveCategoryIcon({ icon: null, name: 'Food' })).toEqual({ Icon: iconOf('utensils') });
  });

  it('never gives a letter: an unknown name ends at the generic icon', () => {
    expect(resolveCategoryIcon({ icon: null, name: 'Zzz' })).toEqual({ Icon: iconOf(GENERIC_ICON_NAME) });
  });

  it('shows every emoji of the old picker as a line icon', () => {
    for (const emoji of EMOJI_CHOICES) {
      expect(resolveCategoryIcon({ icon: emoji, name: 'Any' }).Icon, emoji).toBeTruthy();
    }
  });

  it('keeps any other emoji as it is', () => {
    expect(resolveCategoryIcon({ icon: '🦄', name: 'Any' })).toEqual({ emoji: '🦄' });
  });
});

describe('helpers for the form', () => {
  it('tells an emoji from an icon name', () => {
    expect(isEmojiIcon('🍜')).toBe(true);
    expect(isEmojiIcon('gamepad-2')).toBe(false);
    expect(isEmojiIcon(null)).toBe(false);
  });

  it('selects the matching icon for an old emoji, and nothing for no icon', () => {
    expect(selectedIconName('plane')).toBe('plane');
    expect(selectedIconName('🍜')).toBe('utensils');
    expect(selectedIconName('🦄')).toBeNull();
    expect(selectedIconName(null)).toBeNull();
  });
});
