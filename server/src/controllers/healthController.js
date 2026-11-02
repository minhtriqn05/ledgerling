import { allowedOrigins } from "../config/origins.js";

// When this server process started; the version when Render does not name a commit (on your own computer)
const STARTED_AT = new Date().toISOString();

// The API is up. version says which build answers: the Git commit Render deployed (RENDER_GIT_COMMIT), or the time this
// server started. The live smoke test (.github/workflows/live-smoke.yml) waits until it shows the commit just merged.
export function health(req, res) {
  res.status(200).json({ success: true, data: { version: process.env.RENDER_GIT_COMMIT || STARTED_AT } });
}

const REPOSITORY = "https://github.com/minhtriqn05/ledgerling";

// The front page of the API (GET /api): what it is and where to go next, for someone who opens the base URL in a
// browser. The addresses are built from the request, so they are right on Render and on localhost alike.
export function apiIndex(req, res) {
  const origin = `${req.protocol}://${req.get("host")}`;
  res.status(200).json({
    success: true,
    data: {
      name: "Ledgerling API",
      description: "REST API of Ledgerling, a personal expense tracker",
      version: process.env.RENDER_GIT_COMMIT || STARTED_AT,
      docs: `${origin}/api-docs`,
      health: `${origin}/api/health`,
      app: allowedOrigins()[0] ?? null,
      repository: REPOSITORY,
    },
  });
}
