// Characters that mean something in a regular expression get a backslash, so a search for "a.b" or "(" finds
// that text and nothing else (the transaction search and the admin user search).
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
