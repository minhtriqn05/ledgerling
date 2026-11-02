// When this server process started; the version when Render does not name a commit (on your own computer)
const STARTED_AT = new Date().toISOString();

// The API is up. version says which build answers: the Git commit Render deployed (RENDER_GIT_COMMIT), or the time this
// server started. The live smoke test (.github/workflows/live-smoke.yml) waits until it shows the commit just merged.
export function health(req, res) {
  res.status(200).json({ success: true, data: { version: process.env.RENDER_GIT_COMMIT || STARTED_AT } });
}
