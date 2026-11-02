import { describe, expect, it, vi } from "vitest";
import { api, registerUser } from "./helpers.js";

// bcrypt.compare is the slow part of a login. If it only ran for an email that has an account, the answer time would
// tell an attacker which emails are registered, although the answer itself is the same 401.
const counter = vi.hoisted(() => ({ compares: 0 }));
vi.mock("bcryptjs", async (importOriginal) => {
  const bcrypt = (await importOriginal()).default;
  const compare = (...args) => {
    counter.compares += 1;
    return bcrypt.compare(...args);
  };
  return { default: { ...bcrypt, compare } };
});

describe("login timing", () => {
  it("compares a password hash for an unknown email too, so both 401 answers take as long", async () => {
    const user = await registerUser();

    counter.compares = 0;
    const unknown = await api().post("/api/auth/login").send({ email: "nobody-here@example.com", password: "secret123" });
    expect(unknown.status).toBe(401);
    expect(counter.compares).toBe(1);

    const wrong = await api().post("/api/auth/login").send({ email: user.email, password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(counter.compares).toBe(2);
    expect(unknown.body).toEqual(wrong.body);
  });
});
