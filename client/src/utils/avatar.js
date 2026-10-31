// The round avatar of a person: the first letter of the name on a color. No picture is stored.
const TONES = ['sky', 'coral', 'teal', 'sun', 'periwinkle', 'mint'];

// "nguyễn minh trí" -> "N". A name without letters (or an empty one) gives "?".
export function initialOf(name) {
  const first = Array.from(String(name ?? '').trim())[0];
  return first ? first.toUpperCase() : '?';
}

// The same name always gets the same accent color (a name from tokens.css: sky, coral, teal, sun, periwinkle, mint)
export function avatarTone(name) {
  const text = String(name ?? '').trim().toLowerCase();
  let sum = 0;
  for (const character of text) sum += character.codePointAt(0);
  return TONES[sum % TONES.length];
}
