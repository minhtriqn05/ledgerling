// The ready-made avatars. Each id is the name of a drawing in assets/avatars/<id>.svg (components/Avatar loads them).
// Only the id is saved in the database. The server keeps the same list in server/src/utils/avatars.js;
// a server test checks that both lists stay the same. The group names are translated under "avatar.groups".
export const AVATAR_GROUPS = {
  animals: ['cat', 'dog', 'panda', 'rabbit', 'fox', 'penguin', 'bear', 'tiger'],
  food: ['cupcake', 'milk', 'strawberry', 'avocado', 'donut', 'pancake', 'boba', 'onigiri'],
  nature: ['cloud', 'tree', 'mushroom', 'sun', 'flower', 'moon', 'cactus', 'rainbow'],
  fun: ['robot', 'astronaut', 'dino', 'ghost', 'rocket', 'alien', 'blob', 'gamepad'],
};

export const AVATAR_GROUP_KEYS = Object.keys(AVATAR_GROUPS);
export const PRESET_AVATAR_IDS = Object.values(AVATAR_GROUPS).flat();

export const isPresetAvatarId = (id) => PRESET_AVATAR_IDS.includes(id);

// The group a preset id belongs to ('animals' for 'cat'), or null for an unknown id
export function groupOfAvatar(id) {
  return AVATAR_GROUP_KEYS.find((group) => AVATAR_GROUPS[group].includes(id)) ?? null;
}
