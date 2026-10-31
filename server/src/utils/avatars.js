// The ready-made avatars a user can pick. They are SVG files drawn for the app
// (client/src/assets/avatars/<id>.svg); only the id is stored in the database.
// The client keeps the same groups in client/src/utils/avatarCatalog.js; a server test checks that both stay the same.
export const AVATAR_GROUPS = {
  animals: ["cat", "dog", "panda", "rabbit", "fox", "penguin", "bear", "tiger"],
  food: ["cupcake", "milk", "strawberry", "avocado", "donut", "pancake", "boba", "onigiri"],
  nature: ["cloud", "tree", "mushroom", "sun", "flower", "moon", "cactus", "rainbow"],
  fun: ["robot", "astronaut", "dino", "ghost", "rocket", "alien", "blob", "gamepad"],
};

export const PRESET_AVATAR_IDS = Object.values(AVATAR_GROUPS).flat();

export const isPresetAvatarId = (id) => typeof id === "string" && PRESET_AVATAR_IDS.includes(id);

// A new account gets one of the ready-made avatars at random
export function randomPresetAvatar() {
  const value = PRESET_AVATAR_IDS[Math.floor(Math.random() * PRESET_AVATAR_IDS.length)];
  return { type: "preset", value };
}

// An uploaded photo is a data URL. The app shrinks it to a 256x256 WebP of about 100 kB before sending it;
// the server accepts a little more than that and checks what the file really is (see validateAvatar).
export const AVATAR_MIME_TYPES = ["image/webp", "image/png", "image/jpeg"];
export const MAX_AVATAR_BYTES = 120 * 1024;
// The JSON body of PATCH /users/me/avatar: the base64 text of MAX_AVATAR_BYTES is a third bigger, plus the JSON around it
export const AVATAR_BODY_LIMIT = "200kb";
