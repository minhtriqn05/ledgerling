import request from "supertest";
import app from "../src/app.js";

// Supertest sends requests straight to the Express app, without opening a port
export const api = () => request(app);

let counter = 0;

// Registers a new user with a unique email and returns { token, user, email, password }
export async function registerUser(overrides = {}) {
  counter += 1;
  const body = {
    name: "Test User",
    email: `user${counter}-${Date.now()}@example.com`,
    password: "secret123",
    ...overrides,
  };
  const res = await api().post("/api/auth/register").send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${res.body.message}`);
  return { ...res.body.data, email: body.email, password: body.password };
}

// The header a signed-in request needs
export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

// The user's category with this name (one of the defaults created at sign-up)
export async function findCategory(token, name) {
  const res = await api().get("/api/categories").set(auth(token));
  const category = res.body.data.find((c) => c.name === name);
  if (!category) throw new Error(`category ${name} not found`);
  return category;
}
