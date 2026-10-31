import { isEmojiIcon } from './categoryIcons.js';

// The emoji of the old icon picker. Categories saved back then still store one of them; utils/categoryIcons.js shows
// them as line icons. Every entry is one emoji (checked by emoji.test.js), which the API still accepts for Category.icon.
export const EMOJI_CHOICES = [
  // Food and drink
  '🍜', '🍔', '🍕', '☕', '🍺', '🛒', '🍎', '🍰',
  // Getting around
  '🚌', '🚗', '⛽', '🏍️', '✈️', '🚆',
  // Home and bills
  '🏠', '🧾', '💡', '📱', '💧', '📶',
  // Shopping and gifts
  '🛍️', '👕', '🎁', '📚',
  // Fun and sport
  '🎬', '🎮', '🎵', '🏋️', '⚽', '🎤',
  // Health, school, pets, care
  '💊', '🏥', '🎓', '🐶', '💇',
  // Money
  '💰', '💵', '💼', '📈', '💳',
];

// "🍜 Food" when the category stores an emoji, otherwise just "Food". For plain text: select options, labels.
// (Line icons are drawn by CategoryMark; a <select> cannot show them.)
export function categoryLabel(category) {
  return isEmojiIcon(category.icon) ? `${category.icon} ${category.name}` : category.name;
}
