import { describe, expect, it } from 'vitest';
import { EMOJI_CHOICES, categoryLabel } from './emoji.js';

describe('EMOJI_CHOICES', () => {
  it('has about 40 emoji, none twice', () => {
    expect(EMOJI_CHOICES).toHaveLength(40);
    expect(new Set(EMOJI_CHOICES).size).toBe(EMOJI_CHOICES.length);
  });

  it('is only single emoji, the same rule the API uses', () => {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    for (const emoji of EMOJI_CHOICES) {
      expect([...segmenter.segment(emoji)], emoji).toHaveLength(1);
      expect(/\p{Extended_Pictographic}/u.test(emoji), emoji).toBe(true);
    }
  });
});

describe('categoryLabel', () => {
  it('puts the icon before the name', () => {
    expect(categoryLabel({ name: 'Food', icon: '🍜' })).toBe('🍜 Food');
  });

  it('is just the name without an icon', () => {
    expect(categoryLabel({ name: 'Food', icon: null })).toBe('Food');
    expect(categoryLabel({ name: 'Food' })).toBe('Food');
  });
});
