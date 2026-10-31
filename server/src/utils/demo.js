// The one public demo account ("Try the demo" on the landing page). It is made by `npm run seed`
// (src/seed.js), never by the API. Its password is DEMO_PASSWORD in .env.
export const DEMO_EMAIL = "demo@example.com";
export const DEMO_NAME = "Demo User";

export const isDemoEmail = (email) => email === DEMO_EMAIL;

// The demo account keeps one fixed avatar (the seed sets it), so every visitor sees the same face
export const DEMO_AVATAR = { type: "preset", value: "panda" };
