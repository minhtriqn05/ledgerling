// Turning a photo from the user's computer into an avatar: crop a square, shrink it to 256x256 and save it as a
// small WebP (a JPEG where the browser cannot make WebP). Nothing is uploaded until the user presses save.

export const AVATAR_SIZE = 256;
// The server accepts up to 120 kB; the app aims lower so a photo is never refused
export const MAX_AVATAR_BYTES = 100 * 1024;
// The file the user picks may be big (a phone photo): it is only read here, then shrunk
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export const isAcceptedImage = (file) => Boolean(file) && ACCEPTED_TYPES.includes(file.type);

// The size in bytes of the file inside a data URL ("data:image/webp;base64,....")
export function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const base64 = comma === -1 ? '' : dataUrl.slice(comma + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// The crop box is a square of `viewSize` pixels on screen. The photo is drawn at `zoom` times the smallest size that
// still covers the box, with its top-left corner at (x, y) inside the box (x and y are 0 or negative).

// How many screen pixels one pixel of the photo takes
export function photoScale({ width, height, viewSize, zoom }) {
  return (Math.max(viewSize / width, viewSize / height)) * zoom;
}

// Keeps the photo covering the whole box, so there is never an empty edge in the avatar
export function clampOffset({ width, height, viewSize, zoom, x, y }) {
  const scale = photoScale({ width, height, viewSize, zoom });
  const clamp = (value, drawn) => Math.min(0, Math.max(viewSize - drawn, value));
  return { x: clamp(x, width * scale), y: clamp(y, height * scale) };
}

// Where the photo starts when it is first shown: centered
export function centeredOffset({ width, height, viewSize, zoom = MIN_ZOOM }) {
  const scale = photoScale({ width, height, viewSize, zoom });
  return { x: (viewSize - width * scale) / 2, y: (viewSize - height * scale) / 2 };
}

// Another zoom level that keeps the middle of the box where it is (the point under the middle stays under it)
export function zoomAround({ width, height, viewSize, zoom, nextZoom, x, y }) {
  const before = photoScale({ width, height, viewSize, zoom });
  const after = photoScale({ width, height, viewSize, zoom: nextZoom });
  const middle = viewSize / 2;
  const moved = { x: middle - ((middle - x) * after) / before, y: middle - ((middle - y) * after) / before };
  return clampOffset({ width, height, viewSize, zoom: nextZoom, ...moved });
}

// The square of the original photo that is inside the box: { sx, sy, size } in photo pixels
export function cropRect({ width, height, viewSize, zoom, x, y }) {
  const scale = photoScale({ width, height, viewSize, zoom });
  return { sx: -x / scale, sy: -y / scale, size: viewSize / scale };
}

// Reads the picked file into an <img>. The caller revokes `url` when it is done.
export function loadImage(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    image.src = url;
  });
}

// Draws the chosen square into a 256x256 canvas and returns it as a data URL of at most MAX_AVATAR_BYTES.
// The quality goes down step by step until the file is small enough.
export function renderAvatar(image, rect) {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, rect.sx, rect.sy, rect.size, rect.size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  // A browser that cannot make WebP answers with a PNG: use JPEG then, which is small too
  const webp = canvas.toDataURL('image/webp', 0.9).startsWith('data:image/webp');
  const type = webp ? 'image/webp' : 'image/jpeg';

  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]) {
    const dataUrl = canvas.toDataURL(type, quality);
    if (dataUrlBytes(dataUrl) <= MAX_AVATAR_BYTES) return dataUrl;
  }
  throw new Error('too-large');
}
