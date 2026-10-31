import { beforeAll, describe, expect, it } from "vitest";
import User from "../src/models/User.js";
import { AVATAR_GROUPS, PRESET_AVATAR_IDS } from "../src/utils/avatars.js";
import { AVATAR_GROUPS as CLIENT_GROUPS } from "../../client/src/utils/avatarCatalog.js";
import { api, auth, registerUser } from "./helpers.js";

// Avatars: 32 ready-made ones (the id is stored) or an uploaded photo (a small data URL is stored).

const patchAvatar = (token, body) => api().patch("/api/users/me/avatar").set(auth(token)).send(body);
const deleteAvatar = (token) => api().delete("/api/users/me/avatar").set(auth(token));
const me = (token) => api().get("/api/auth/me").set(auth(token));

// The first bytes of a real file of each type are enough: the server only looks at those (and at the size)
const WEBP_HEAD = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP"), Buffer.from("VP8 ")]);
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

function dataUrl(mime, head, totalBytes = head.length) {
  const bytes = Buffer.concat([head, Buffer.alloc(Math.max(0, totalBytes - head.length), 1)]);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

let user;

beforeAll(async () => {
  user = await registerUser({ name: "Avatar Person" });
});

describe("the list of ready-made avatars", () => {
  it("has 32 different ids in four groups of 8", () => {
    expect(Object.keys(AVATAR_GROUPS)).toEqual(["animals", "food", "nature", "fun"]);
    expect(PRESET_AVATAR_IDS).toHaveLength(32);
    expect(new Set(PRESET_AVATAR_IDS).size).toBe(32);
  });

  it("is the same list as the one the client draws", () => {
    expect(CLIENT_GROUPS).toEqual(AVATAR_GROUPS);
  });
});

describe("new accounts", () => {
  it("get one of the ready-made avatars, and /auth/me returns it", async () => {
    expect(user.user.avatar.type).toBe("preset");
    expect(PRESET_AVATAR_IDS).toContain(user.user.avatar.value);

    const res = await me(user.token);
    expect(res.body.data.avatar).toEqual(user.user.avatar);
  });
});

describe("PATCH /api/users/me/avatar", () => {
  it("chooses a ready-made avatar", async () => {
    const res = await patchAvatar(user.token, { type: "preset", value: "fox" });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toEqual({ type: "preset", value: "fox" });
    expect((await me(user.token)).body.data.avatar).toEqual({ type: "preset", value: "fox" });
  });

  it("saves an uploaded WebP, PNG or JPEG photo", async () => {
    for (const [mime, head] of [["image/webp", WEBP_HEAD], ["image/png", PNG_HEAD], ["image/jpeg", JPEG_HEAD]]) {
      const value = dataUrl(mime, head, 3000);
      const res = await patchAvatar(user.token, { type: "upload", value });
      expect(res.status).toBe(200);
      expect(res.body.data.avatar).toEqual({ type: "upload", value });
    }
  });

  it("400 INVALID_AVATAR for an id that is not in the list, a missing value or an unknown type", async () => {
    for (const body of [
      { type: "preset", value: "not-an-avatar" },
      { type: "preset" },
      { type: "preset", value: ["fox"] },
      { type: "emoji", value: "fox" },
      {},
    ]) {
      const res = await patchAvatar(user.token, body);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: "INVALID_AVATAR" });
    }
  });

  it("400 INVALID_AVATAR_IMAGE for a file that is not a JPEG, PNG or WebP image", async () => {
    const gif = `data:image/gif;base64,${Buffer.from("GIF89a....").toString("base64")}`;
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg onload=alert(1)/>").toString("base64")}`;
    const notBase64 = "data:image/webp;base64,@@@";
    // The data URL says PNG but the bytes are not
    const lying = `data:image/png;base64,${Buffer.from("this is plain text, not a picture").toString("base64")}`;

    for (const value of [gif, svg, notBase64, lying, "https://example.com/me.png", "", 42]) {
      const res = await patchAvatar(user.token, { type: "upload", value });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_AVATAR_IMAGE");
    }
  });

  it("413 for a photo that is too big (by the data, and by the size of the body)", async () => {
    const big = await patchAvatar(user.token, { type: "upload", value: dataUrl("image/webp", WEBP_HEAD, 125 * 1024) });
    expect(big.status).toBe(413);
    expect(big.body.code).toBe("PAYLOAD_TOO_LARGE");

    const huge = await patchAvatar(user.token, { type: "upload", value: dataUrl("image/webp", WEBP_HEAD, 400 * 1024) });
    expect(huge.status).toBe(413);
    expect(huge.body.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("accepts a photo of about 100 kB (a body bigger than the 100 kB every other route accepts)", async () => {
    const res = await patchAvatar(user.token, { type: "upload", value: dataUrl("image/webp", WEBP_HEAD, 100 * 1024) });
    expect(res.status).toBe(200);
  });

  it("does not raise the body limit of the other routes", async () => {
    const res = await api().patch("/api/users/me").set(auth(user.token)).send({ name: "x".repeat(150 * 1024) });
    expect(res.status).toBe(413);
  });

  it("401 without a token", async () => {
    const res = await api().patch("/api/users/me/avatar").send({ type: "preset", value: "cat" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("only changes the avatar of the signed-in user, never one named in the body", async () => {
    const other = await registerUser({ name: "Other Person" });
    const before = (await me(other.token)).body.data.avatar;

    const res = await patchAvatar(user.token, { type: "preset", value: "tiger", userId: other.user._id, _id: other.user._id });
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(user.user._id);

    expect((await me(other.token)).body.data.avatar).toEqual(before);
    expect((await User.findById(other.user._id)).avatar.value).toBe(before.value);
  });
});

describe("DELETE /api/users/me/avatar", () => {
  it("removes the avatar, and removing it again is fine", async () => {
    const res = await deleteAvatar(user.token);
    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBeUndefined();
    expect((await me(user.token)).body.data.avatar).toBeUndefined();

    expect((await deleteAvatar(user.token)).status).toBe(200);
  });

  it("401 without a token, and does not touch another user", async () => {
    expect((await api().delete("/api/users/me/avatar")).status).toBe(401);

    const other = await registerUser();
    await deleteAvatar(user.token);
    expect((await me(other.token)).body.data.avatar).toEqual(other.user.avatar);
  });
});
