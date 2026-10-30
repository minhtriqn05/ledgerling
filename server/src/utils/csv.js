// Makes text safe to put in one CSV cell.
// 1) A cell that starts with = + - @ (or a tab / carriage return) would be run as a formula by Excel or
//    Google Sheets (CSV injection), so a ' is put in front of it. The ' makes the spreadsheet read it as text.
// 2) A cell with a comma, a double quote or a line break goes inside double quotes, and each " becomes "".
const FORMULA_START_REGEX = /^[=+\-@\t\r]/;
const NEEDS_QUOTES_REGEX = /[",\r\n]/;

export function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START_REGEX.test(text)) text = `'${text}`;
  if (NEEDS_QUOTES_REGEX.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// The BOM tells Excel the file is UTF-8, so accents (like "ăn") are not shown as garbage.
const BOM = "﻿";

// header: array of column names, rows: array of arrays. Lines end with CRLF, like RFC 4180 asks.
export function buildCsv(header, rows) {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}
