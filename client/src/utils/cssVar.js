// Reads a CSS variable from tokens.css, e.g. cssVar('--color-income') -> '#0d9488'.
// Recharts draws SVG and needs real color values, so charts read the tokens with this
// instead of hardcoding hex codes.
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
