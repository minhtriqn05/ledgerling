import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_ROWS, parseCsvText, parseTags, undoFormulaGuard, validateImportRow } from './csvImport.js';

const categories = [
  { name: 'Food', type: 'expense' },
  { name: 'Salary', type: 'income' },
];

const goodRow = {
  date: '2026-10-27 12:30',
  type: 'expense',
  category: 'Food',
  amount: 45000,
  currency: 'VND',
  note: 'Lunch',
  tags: ['work'],
};

describe('undoFormulaGuard', () => {
  it('takes off the quote the export puts before = + - @', () => {
    expect(undoFormulaGuard("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(undoFormulaGuard("'+84 123")).toBe('+84 123');
    expect(undoFormulaGuard("'-5 off")).toBe('-5 off');
    expect(undoFormulaGuard("'@home")).toBe('@home');
  });

  it('leaves every other text alone', () => {
    expect(undoFormulaGuard("'quoted word")).toBe("'quoted word");
    expect(undoFormulaGuard('=SUM(A1)')).toBe('=SUM(A1)');
    expect(undoFormulaGuard('Lunch')).toBe('Lunch');
    expect(undoFormulaGuard('')).toBe('');
  });
});

describe('parseTags', () => {
  it('splits on ; , and spaces, lower-cases, drops # and duplicates', () => {
    expect(parseTags('work;trip')).toEqual(['work', 'trip']);
    expect(parseTags('Work, #Trip  team-lunch;work')).toEqual(['work', 'trip', 'team-lunch']);
  });

  it('gives no tags for an empty cell', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags(' ; ')).toEqual([]);
  });
});

describe('parseCsvText', () => {
  const header = 'Date,Type,Category,Amount,Currency,Note,Tags';

  it('reads the file the export makes, BOM and CRLF included', () => {
    const csv = `﻿${header}\r\n2026-10-27 12:30,expense,Food,45000,VND,Lunch,work;trip\r\n2026-10-28 09:00,income,Salary,9000000,VND,"Pay, October",\r\n`;
    expect(parseCsvText(csv)).toEqual({
      rows: [
        { date: '2026-10-27 12:30', type: 'expense', category: 'Food', amount: 45000, currency: 'VND', note: 'Lunch', tags: ['work', 'trip'] },
        { date: '2026-10-28 09:00', type: 'income', category: 'Salary', amount: 9000000, currency: 'VND', note: 'Pay, October', tags: [] },
      ],
    });
  });

  it("undoes the export's formula guard in the note and the category", () => {
    const csv = `${header}\n2026-10-27 12:30,expense,Food,1000,VND,'=SUM(A1),\n`;
    expect(parseCsvText(csv).rows[0].note).toBe('=SUM(A1)');
  });

  it('keeps quotes and line breaks inside a quoted note', () => {
    const csv = `${header}\n2026-10-27 12:30,expense,Food,1000,VND,"say ""hi""\nthen leave",\n`;
    expect(parseCsvText(csv).rows[0].note).toBe('say "hi"\nthen leave');
  });

  it('finds the columns by name, in any order and any case, and skips empty lines', () => {
    const csv = 'amount,CATEGORY, Type\n1000,Food,expense\n\n,,\n2000,Salary,income\n';
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ amount: 2000, category: 'Salary', type: 'income', date: '', tags: [] });
  });

  it('keeps an amount that is not a number as text, so the row is marked as an error', () => {
    const csv = `${header}\n2026-10-27,expense,Food,abc,,,\n2026-10-27,expense,Food,,,,\n`;
    const { rows } = parseCsvText(csv);
    expect(rows[0].amount).toBe('abc');
    expect(rows[1].amount).toBe('');
  });

  it('refuses a file without the needed columns', () => {
    expect(parseCsvText('Date,Note\n2026-10-27,Lunch\n').error).toBe(
      'The file has no Type, Category, Amount column. Use a file exported from Ledgerling.'
    );
  });

  it('refuses a file without rows', () => {
    expect(parseCsvText(`${header}\n`).error).toBe('The file has no rows.');
    expect(parseCsvText('').error).toBeTruthy();
  });

  it('accepts exactly 500 rows and refuses 501', () => {
    const line = '2026-10-27,expense,Food,1000\n';
    expect(parseCsvText(`Date,Type,Category,Amount\n${line.repeat(MAX_IMPORT_ROWS)}`).rows).toHaveLength(500);
    expect(parseCsvText(`Date,Type,Category,Amount\n${line.repeat(MAX_IMPORT_ROWS + 1)}`).error).toBe(
      'The file has 501 rows. You can import at most 500 rows at a time.'
    );
  });
});

describe('validateImportRow', () => {
  const check = (changes) => validateImportRow({ ...goodRow, ...changes }, categories);

  it('accepts a good row', () => {
    expect(check({})).toBe('');
  });

  it('accepts the date formats of the server and empty optional cells', () => {
    expect(check({ date: '2026-10-27' })).toBe('');
    expect(check({ date: '2026-10-27T12:30:00+07:00' })).toBe('');
    expect(check({ date: '' })).toBe('');
    expect(check({ currency: '', note: '', tags: [] })).toBe('');
  });

  it('finds the category ignoring case', () => {
    expect(check({ category: 'food' })).toBe('');
  });

  it.each([
    [{ type: 'other' }, 'Type must be income or expense'],
    [{ category: '' }, 'Category is required'],
    [{ amount: 0 }, 'Amount must be greater than 0'],
    [{ amount: -5 }, 'Amount must be greater than 0'],
    [{ amount: 'abc' }, 'Amount must be greater than 0'],
    [{ date: 'yesterday' }, 'Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601'],
    [{ date: '2026-02-30' }, 'Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601'],
    [{ date: '2026-10-27 25:00' }, 'Date is invalid, use YYYY-MM-DD HH:mm or ISO 8601'],
    [{ currency: 'DONG' }, 'Currency must be a 3-letter ISO code'],
    [{ note: 'x'.repeat(201) }, 'Note must be at most 200 characters'],
    [{ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'A transaction can have at most 5 tags'],
    [{ tags: ['bad_tag'] }, 'Each tag must be 1-20 letters, digits or hyphens'],
    [{ tags: ['a'.repeat(21)] }, 'Each tag must be 1-20 letters, digits or hyphens'],
    [{ category: 'Groceries' }, 'Category "Groceries" (expense) not found'],
    [{ category: 'Salary' }, 'Category "Salary" (expense) not found'],
  ])('marks %j', (changes, message) => {
    expect(check(changes)).toBe(message);
  });
});
