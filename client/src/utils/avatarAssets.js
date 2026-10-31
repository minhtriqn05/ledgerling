import { isPresetAvatarId } from './avatarCatalog.js';

// The 32 drawings (assets/avatars/<id>.svg). Vite turns each file into an address, so a drawing is only downloaded
// when it is shown.
const files = import.meta.glob('../assets/avatars/*.svg', { eager: true, query: '?url', import: 'default' });

// The address of the drawing of a ready-made avatar, or null for an id that does not exist
export function presetAvatarUrl(id) {
  return isPresetAvatarId(id) ? (files[`../assets/avatars/${id}.svg`] ?? null) : null;
}

// What an uploaded photo must look like before it goes into an <img> (the server checks it too)
const PHOTO_DATA_URL = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

// The picture to draw for a user's avatar { type, value }, or null when there is none: the app then shows the first
// letter of the name.
export function avatarSrc(avatar) {
  if (!avatar) return null;
  if (avatar.type === 'preset') return presetAvatarUrl(avatar.value);
  if (avatar.type === 'upload' && PHOTO_DATA_URL.test(avatar.value ?? '')) return avatar.value;
  return null;
}
