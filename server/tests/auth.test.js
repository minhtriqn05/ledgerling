import { describe, expect, it } from "vitest";
import { api, auth, registerUser } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("creates an account (201) and returns a token without the password hash", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "  Minh Tri ", email: "  Tri@Example.COM ", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user).toMatchObject({ name: "Minh Tri", email: "tri@example.com" });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("refuses an email that is already registered (409), whatever its case", async () => {
    const { email } = await registerUser();
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Someone", email: email.toUpperCase(), password: "secret123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: "Email is already registered" });
  });

  it.each([
    [{ email: "a@b.co", password: "secret123" }, "Name is required"],
    [{ name: "A", email: "not-an-email", password: "secret123" }, "Email is invalid"],
    [{ name: "A", email: "a@b.co", password: "12345" }, "Password must be at least 6 characters"],
  ])("refuses invalid input (400): %o", async (body, message) => {
    const res = await api().post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message });
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password (200)", async () => {
    const { email, password } = await registerUser();
    const res = await api().post("/api/auth/login").send({ email, password });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe(email);
  });

  it("refuses a wrong password (401)", async () => {
    const { email } = await registerUser();
    const res = await api().post("/api/auth/login").send({ email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Invalid email or password" });
  });

  it("gives the same 401 for an unknown email", async () => {
    const res = await api()
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "secret123" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the signed-in user with a valid token (200)", async () => {
    const { token, user } = await registerUser({ name: "Me Myself" });
    const res = await api().get("/api/auth/me").set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ _id: user._id, name: "Me Myself" });
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("refuses a request without a token (401)", async () => {
    const res = await api().get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Not authorized, token missing" });
  });

  it("refuses an invalid token (401)", async () => {
    const res = await api().get("/api/auth/me").set(auth("not.a.real.token"));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, invalid token");
  });
});

describe("GET /api/health", () => {
  it("answers 200 without a token", async () => {
    const res = await api().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
