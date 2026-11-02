import { describe, expect, it } from "vitest";
import { api } from "./helpers.js";

// The public front page of the API: what a teacher or a visitor sees when they open the base URL in a browser.

describe("GET /api", () => {
  it("answers without a token, with the links to the docs, the health check and the code", async () => {
    const res = await api().get("/api");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: "Ledgerling API",
      repository: "https://github.com/minhtriqn05/ledgerling",
    });
    expect(res.body.data.docs).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api-docs$/);
    expect(res.body.data.health).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/health$/);
    expect(typeof res.body.data.version).toBe("string");
  });

  it("answers the same with a trailing slash", async () => {
    const res = await api().get("/api/");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Ledgerling API");
  });

  it("builds the links from the address the visitor used", async () => {
    const res = await api().get("/api").set("Host", "ledgerling-api.onrender.com").set("X-Forwarded-Proto", "https");

    expect(res.body.data.docs).toBe("https://ledgerling-api.onrender.com/api-docs");
    expect(res.body.data.health).toBe("https://ledgerling-api.onrender.com/api/health");
  });

  it("names the first address of CLIENT_URL as the app", async () => {
    const res = await api().get("/api");

    expect(res.body.data.app).toBe((process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/+$/, "") || null);
  });

  it("keeps the 404 for an unknown path under /api", async () => {
    const res = await api().get("/api/nothing-here");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ROUTE_NOT_FOUND");
  });
});

describe("GET /", () => {
  it("sends the visitor to the interactive docs", async () => {
    const res = await api().get("/");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/api-docs/");
  });
});
