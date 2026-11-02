// The addresses of the app that may call the API and open a socket: CLIENT_URL, comma-separated.
// A browser sends its Origin without a trailing slash, so one written in CLIENT_URL is taken off.
export function allowedOrigins() {
  return (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}
