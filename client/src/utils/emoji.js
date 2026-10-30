// The emoji a category can use as its icon (the picker in the category form). No library: just a list.
// Every entry is one emoji (checked by emoji.test.js), which is what the API accepts for Category.icon.
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

// "🍜 Food", or just "Food" when the category has no icon. For plain text: select options, labels.
export function categoryLabel(category) {
  return category.icon ? `${category.icon} ${category.name}` : category.name;
}
