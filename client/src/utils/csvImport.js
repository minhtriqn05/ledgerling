import Papa from 'papaparse';

// Reads the CSV file of "Import CSV" and checks its rows before they are sent (POST /transactions/import).
// The columns are the ones of the export: Date, Type, Category, Amount, Currency, Note, Tags.
// The server checks every row again; the checks here only exist to mark the bad rows in the preview.

export const MAX_IMPORT_ROWS = 500;

const REQUIRED_COLUMNS = ['type', 'category', 'amount'];
const TYPES = ['income', 'expense'];
const MAX_TAGS = 5;
const TAG_REGEX = /^[a-z0-9-]{1,20}$/;
const CURRENCY_REGEX = /^[A-Za-z]{3}$/;
// The date of the export ("2026-10-27 12:30") or just a day
const EXPORT_DATE_REGEX = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const ISO_START_REGEX = /^\d{4}-\d{2}-\d{2}/;

// The export puts a ' in front of a cell that starts with = + - @ (so a spreadsheet does not run it as a formula).
// Taking it off again gives back the text that was saved: "'=SUM(A1)" -> "=SUM(A1)".
export function undoFormulaGuard(text) {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text;
}

// "work; Trip, team-lunch" -> ["work", "trip", "team-lunch"]. A leading # is allowed ("#work").
export function parseTags(text) {
  const tags = text
    .split(/[;,\s]+/)
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

// "2026-02-30" has the right shape but is not a real day (Date.UTC would quietly turn it into March 2nd)
function isRealDay(day) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toISOString().slice(0, 10) === day;
}

// Text -> number when it is a number, otherwise the text itself (the row is then marked as an error)
function parseAmount(text) {
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? number : text;
}

// Turns the text of a CSV file into rows ready to send: { date, type, category, amount, currency, note, tags }.
// Returns { rows } or { error } when the file cannot be used.
export function parseCsvText(text) {
  // Excel writes a BOM in front of the first column name
  const result = Papa.parse(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (name) => name.trim().toLowerCase(),
  });

  const columns = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length > 0) {
    const names = missing.map((name) => name[0].toUpperCase() + name.slice(1));
    return { error: `The file has no ${names.join(', ')} column. Use a file exported from Ledgerling.` };
  }
  if (result.data.length === 0) return { error: 'The file has no rows.' };
  if (result.data.length > MAX_IMPORT_ROWS) {
    return {
      error: `The file has ${result.data.length} rows. You can import at most ${MAX_IMPORT_ROWS} rows at a time.`,
    };
  }

  const cell = (record, name) => (record[name] ?? '').trim();
  const rows = result.data.map((record) => ({
    date: cell(record, 'date'),
    type: cell(record, 'type').toLowerCase(),
    category: undoFormulaGuard(cell(record, 'category')),
    amount: parseAmount(cell(record, 'amount')),
    currency: cell(record, 'currency'),
    note: undoFormulaGuard(cell(record, 'note')),
    tags: parseTags(cell(record, 'tags')),
  }));
  return { rows };
}

function isValidDate(text) {
  if (text === '') return true; // empty = now
  const match = EXPORT_DATE_REGEX.exec(text);
  if (match) {
    const [, day, hour = '00', minute = '00', second = '00'] = match;
    return isRealDay(day) && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
  }
  return ISO_START_REGEX.test(text) && !Number.isNaN(Date.parse(text));
}

// The first problem of a row as the same message the server gives, or '' when the row is fine.
// categories: the user's categories ({ name, type }), because a row can only use a category that already exists.
export function validateImportRow(row, categories) {
  if (!TYPES.includes(row.type)) return 'Type must be income or expense';
  if (!row.category) return 'Category is required';
  if (typeof row.amount !== 'number' || row.amount <= 0) return 'Amount must be greater than 0';
  if (!isValidDate(row.date)) return 'Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601';
  if (row.currency && !CURRENCY_REGEX.test(row.currency)) return 'Currency must be a 3-letter ISO code';
  if (row.note.length > 200) return 'Note must be at most 200 characters';
  if (row.tags.length > MAX_TAGS) return `A transaction can have at most ${MAX_TAGS} tags`;
  if (row.tags.some((tag) => !TAG_REGEX.test(tag))) return 'Each tag must be 1-20 letters, digits or hyphens';

  const name = row.category.toLowerCase();
  const exists = categories.some((c) => c.type === row.type && c.name.toLowerCase() === name);
  if (!exists) return `Category "${row.category}" (${row.type}) not found`;
  return '';
}
