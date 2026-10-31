import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import app, { createApp } from "../src/app.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { api, auth, registerUser } from "./helpers.js";

describe("security headers (helmet)", () => {
  it("are on API answers, and the server does not say it is Express", async () => {
    const res = await api().get("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["referrer-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("are also on the 404 answer and on an error answer", async () => {
    const notFound = await api().get("/api/nothing-here");
    const badLogin = await api().post("/api/auth/login").send({});

    expect(notFound.status).toBe(404);
    expect(notFound.headers["x-content-type-options"]).toBe("nosniff");
    expect(badLogin.status).toBe(400);
    expect(badLogin.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("let the app on another origin read the API (CORS is still the gate)", async () => {
    const res = await api().get("/api/health");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
  });

  it("are on the Swagger page, which still opens", async () => {
    const res = await api().get("/api-docs/").redirects(1);

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("compression", () => {
  it("gzips a big answer when the client accepts it", async () => {
    // The Swagger script holds the whole API description, so it is far bigger than the 1 kB threshold
    const res = await api().get("/api-docs/swagger-ui-init.js").set("Accept-Encoding", "gzip");

    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
  });
});

describe("rate limit", () => {
  const login = (app, ip) => {
    const req = request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "secret123" });
    return ip ? req.set("X-Forwarded-For", ip) : req;
  };

  it("is off in the tests, so the other test files can send as many requests as they need", async () => {
    for (let i = 0; i < 25; i += 1) {
      const res = await login(app);
      expect(res.status).toBe(401);
    }
  });

  it("refuses the 21st login or register in 15 minutes with 429 in the usual error format", async () => {
    const limited = createApp({ rateLimit: true });

    for (let i = 0; i < 20; i += 1) {
      const res = await login(limited);
      expect(res.status).toBe(401); // wrong password, but not limited
    }
    const res = await login(limited);

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, message: expect.any(String), code: "RATE_LIMITED" });
    expect(res.headers["ratelimit"] ?? res.headers["ratelimit-limit"]).toBeDefined();

    // register has its own counter
    const register = await request(limited).post("/api/auth/register").send({});
    expect(register.status).toBe(400);
  });

  it("counts each IP address on its own, using the address the proxy forwards (trust proxy)", async () => {
    const limited = createApp({ rateLimit: true });

    for (let i = 0; i < 21; i += 1) await login(limited, "10.0.0.1");
    const blocked = await login(limited, "10.0.0.1");
    const other = await login(limited, "10.0.0.2");

    expect(blocked.status).toBe(429);
    expect(other.status).toBe(401);
  });

  it("refuses the 301st request to /api in 15 minutes, but never the health check", async () => {
    const limited = createApp({ rateLimit: true });

    for (let i = 0; i < 300; i += 1) {
      const res = await request(limited).get("/api/nothing-here");
      expect(res.status).toBe(404);
    }
    const blocked = await request(limited).get("/api/nothing-here");
    const health = await request(limited).get("/api/health");

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: expect.any(String), code: "RATE_LIMITED" });
    expect(health.status).toBe(200);
  });
});

describe("NoSQL injection", () => {
  it("login with { $ne: null } for the email and the password is refused (400)", async () => {
    await registerUser();
    const res = await api()
      .post("/api/auth/login")
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: expect.any(String), code: expect.any(String) });
    expect(res.body.data).toBeUndefined();
  });

  it.each([
    ["email", { email: { $gt: "" }, password: "secret123" }],
    ["password", { email: "someone@example.com", password: { $ne: "" } }],
    ["a nested operator", { email: "someone@example.com", password: { a: { $ne: "" } } }],
    ["a field path with a dot", { email: "someone@example.com", "password.x": "secret123" }],
  ])("cannot be used to log in through the %s", async (_name, body) => {
    const res = await api().post("/api/auth/login").send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("a real account cannot be logged in with { $ne: '' } as the password", async () => {
    const { email } = await registerUser();
    const res = await api().post("/api/auth/login").send({ email, password: { $ne: "" } });

    expect(res.status).toBe(400);
    expect(res.body.data).toBeUndefined();
  });

  it("an operator in the body of a signed-in route is refused (400)", async () => {
    const { token } = await registerUser();
    const res = await api()
      .post("/api/categories")
      .set(auth(token))
      .send({ name: { $ne: "x" }, type: "expense", color: "#112233" });

    expect(res.status).toBe(400);
  });

  it("operators in the address are refused (400), they cannot widen a filter", async () => {
    const { token } = await registerUser();

    const cases = [
      "/api/transactions?categoryId[$ne]=x",
      "/api/transactions?$where=1",
      "/api/transactions?type[$ne]=income",
      "/api/transactions?month=2026-01&month=2026-02",
      "/api/transactions?q=a&q=b",
      "/api/categories?type=expense&type=income",
      "/api/budgets?month[$gt]=2000-01",
      "/api/stats/summary?month=2026-01&month=2026-02",
      "/api/reports/yearly?year=2026&year=2026",
      "/api/admin/users?q[$regex]=.*",
    ];
    for (const url of cases) {
      const res = await api().get(url).set(auth(token));
      expect(res.status, url).toBe(400);
      expect(res.body.success, url).toBe(false);
    }
  });

  it("an operator in a path id finds nothing (404), it is not a query", async () => {
    const { token } = await registerUser();
    const res = await api().get("/api/transactions/%7B%22$ne%22:null%7D").set(auth(token));
    expect(res.status).toBe(404);
  });

  it("a very deep body is refused instead of walked to the end", async () => {
    let deep = { x: 1 };
    for (let i = 0; i < 50; i += 1) deep = { a: deep };
    const res = await api().post("/api/auth/login").send(deep);
    expect(res.status).toBe(400);
  });

  it("normal input is not affected", async () => {
    const { token } = await registerUser();
    const res = await api().get("/api/transactions?type=expense&month=2026-10&q=coffee").set(auth(token));
    expect(res.status).toBe(200);
  });
});

describe("body size limit", () => {
  it("a JSON body over 100 kB is refused with 413 in the usual error format", async () => {
    const res = await api()
      .post("/api/auth/login")
      .send({ email: "a@b.co", password: "x".repeat(150 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ success: false, message: expect.any(String), code: "PAYLOAD_TOO_LARGE" });
  });

  it("a body just under 100 kB is read normally", async () => {
    const res = await api()
      .post("/api/auth/login")
      .send({ email: "a@b.co", password: "x".repeat(90 * 1024) });

    // read and checked as a login: wrong password, not a size error
    expect(res.status).toBe(401);
  });

  it("only the CSV import may be bigger: 100 kB to 300 kB is read, over 300 kB is refused", async () => {
    const { token } = await registerUser();
    const row = { type: "expense", category: "Food", amount: 10000, date: "2026-10-01", note: "n".repeat(200) };
    const importRows = (count) =>
      api()
        .post("/api/transactions/import")
        .set(auth(token))
        .send({ rows: Array.from({ length: count }, () => row) });

    // 400 rows of about 270 bytes = about 108 kB
    const ok = await importRows(400);
    expect(ok.status).toBe(200);
    expect(ok.body.data.imported).toBe(400);

    // 1500 rows are over 300 kB (and over the 500 rows allowed, but the size is checked first)
    const tooBig = await importRows(1500);
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("error handler in production", () => {
  it("answers an unexpected error with a fixed message and no stack trace", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = express();
      app.get("/boom", () => {
        throw new Error("connect ECONNREFUSED mongodb://user:secret@host");
      });
      app.use(errorHandler);

      const res = await request(app).get("/boom");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
      expect(res.text).not.toContain("secret");
      expect(res.text).not.toContain("stack");
      expect(res.text).not.toMatch(/\bat .*\.js/);
      // The real error is still written to the server log
      expect(log).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
      log.mockRestore();
    }
  });
});
