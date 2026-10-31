// The addresses of the app that may call the API and open a socket: CLIENT_URL, comma-separated.
export function allowedOrigins() {
  return (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
