import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from './quickAdd.js';

// The default categories of a new account (only the fields the parser uses)
const categories = [
  { _id: 'food', name: 'Food', type: 'expense' },
  { _id: 'transport', name: 'Transport', type: 'expense' },
  { _id: 'shopping', name: 'Shopping', type: 'expense' },
  { _id: 'bills', name: 'Bills', type: 'expense' },
  { _id: 'fun', name: 'Entertainment', type: 'expense' },
  { _id: 'salary', name: 'Salary', type: 'income' },
  { _id: 'other', name: 'Other Income', type: 'income' },
];
const today = '2026-10-31';

const parse = (text, extra = {}) => parseQuickAdd(text, { categories, today, ...extra });

describe('parseQuickAdd: the examples', () => {
  it('reads "coffee 35k #work"', () => {
    expect(parse('coffee 35k #work')).toEqual({
      amount: 35000,
      date: null,
      tags: ['work'],
      note: 'coffee',
      categoryId: 'food',
    });
  });

  it('reads "salary 15tr yesterday"', () => {
    expect(parse('salary 15tr yesterday')).toEqual({
      amount: 15000000,
      date: '2026-10-30',
      tags: [],
      note: 'salary',
      categoryId: 'salary',
    });
  });

  it('gives an empty result for an empty or blank text', () => {
    const empty = { amount: null, date: null, tags: [], note: '', categoryId: null };
    expect(parse('')).toEqual(empty);
    expect(parse('   ')).toEqual(empty);
  });
});

describe('parseQuickAdd: amounts', () => {
  it.each([
    ['35k', 35000],
    ['35K', 35000],
    ['150k', 150000],
    ['0.5k', 500],
    ['2.5k', 2500],
    ['15tr', 15000000],
    ['1.2tr', 1200000],
    ['1,2tr', 1200000],
    ['1.25tr', 1250000],
    ['2m', 2000000],
    ['1.5m', 1500000],
    ['1,5m', 1500000],
    ['35000', 35000],
    ['35.000', 35000],
    ['35,000', 35000],
    ['1.500.000', 1500000],
    ['1,500,000', 1500000],
    ['12.345.678', 12345678],
    ['35000đ', 35000],
    ['35.000₫', 35000],
    ['35kvnd', 35000],
  ])('reads %s as %i', (token, amount) => {
    expect(parse(`lunch ${token}`).amount).toBe(amount);
  });

  it('finds the amount anywhere in the text', () => {
    expect(parse('35k coffee').amount).toBe(35000);
    expect(parse('coffee with Nam 35k at the corner').amount).toBe(35000);
  });

  it.each([
    ['35.5', 'a decimal without a suffix'],
    ['1.2.3tr', 'two marks and a suffix'],
    ['12.34', 'a group that is not 3 digits'],
    ['1234.567', 'a first group longer than 3 digits'],
    ['k', 'a suffix alone'],
    ['0', 'zero'],
    ['0k', 'zero thousand'],
    ['35x', 'an unknown suffix'],
    ['1000000000000', 'more than 12 digits'],
  ])('does not take %s as an amount (%s)', (token) => {
    const result = parse(`lunch ${token}`);
    expect(result.amount).toBeNull();
    expect(result.note).toBe(`lunch ${token}`);
  });

  it('returns null when there is no amount', () => {
    expect(parse('just coffee').amount).toBeNull();
  });

  it('prefers a clear amount over a bare small number', () => {
    const result = parse('2 coffees 35k');
    expect(result.amount).toBe(35000);
    expect(result.note).toBe('2 coffees');
  });

  it('takes a bare number when it is the only one', () => {
    expect(parse('stamps 5').amount).toBe(5);
  });

  it('takes the last clear amount when there are several', () => {
    const result = parse('dinner 50k 80k');
    expect(result.amount).toBe(80000);
    expect(result.note).toBe('dinner 50k');
  });
});

describe('parseQuickAdd: dates', () => {
  it('reads today and yesterday (any case)', () => {
    expect(parse('lunch 50k today').date).toBe('2026-10-31');
    expect(parse('lunch 50k Yesterday').date).toBe('2026-10-30');
  });

  it('yesterday works across a month and a year boundary', () => {
    expect(parse('lunch 50k yesterday', { today: '2026-11-01' }).date).toBe('2026-10-31');
    expect(parse('lunch 50k yesterday', { today: '2027-01-01' }).date).toBe('2026-12-31');
  });

  it('reads dd/mm in the current year', () => {
    expect(parse('lunch 50k 5/10').date).toBe('2026-10-05');
    expect(parse('lunch 50k 05/03').date).toBe('2026-03-05');
  });

  it('reads dd/mm/yyyy and dd/mm/yy', () => {
    expect(parse('lunch 50k 25/12/2025').date).toBe('2025-12-25');
    expect(parse('lunch 50k 25/12/25').date).toBe('2025-12-25');
  });

  it('uses last year for a dd/mm that is still to come', () => {
    expect(parse('lunch 50k 25/12').date).toBe('2025-12-25');
  });

  it('accepts today itself as dd/mm', () => {
    expect(parse('lunch 50k 31/10').date).toBe('2026-10-31');
  });

  it('refuses a day that does not exist and keeps it in the note', () => {
    const result = parse('lunch 50k 31/02');
    expect(result.date).toBeNull();
    expect(result.note).toBe('lunch 31/02');
    expect(parse('lunch 50k 45/10').date).toBeNull();
    expect(parse('lunch 50k 29/02/2025').date).toBeNull(); // 2025 is not a leap year
  });

  it('reads 29/02 in a leap year', () => {
    expect(parse('lunch 50k 29/02/2028').date).toBe('2028-02-29');
  });

  it('uses the first day when there are two', () => {
    const result = parse('lunch 50k today yesterday');
    expect(result.date).toBe('2026-10-31');
    expect(result.note).toBe('lunch yesterday');
  });

  it('does not mistake a day for an amount', () => {
    const result = parse('lunch 5/10');
    expect(result.amount).toBeNull();
    expect(result.date).toBe('2026-10-05');
  });
});

describe('parseQuickAdd: tags', () => {
  it('reads several tags, in lower case, without the #', () => {
    expect(parse('lunch 50k #Work #team-lunch #q4').tags).toEqual(['work', 'team-lunch', 'q4']);
  });

  it('removes a repeated tag', () => {
    expect(parse('lunch 50k #work #WORK').tags).toEqual(['work']);
  });

  it('keeps at most 5 tags; the rest stay in the note', () => {
    const result = parse('x 50k #a #b #c #d #e #f');
    expect(result.tags).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.note).toBe('x #f');
  });

  it('leaves a tag the API would refuse in the note', () => {
    const result = parse('lunch 50k #team_lunch # #này');
    expect(result.tags).toEqual([]);
    expect(result.note).toBe('lunch #team_lunch # #này');
  });

  it('refuses a tag longer than 20 characters', () => {
    const long = 'a'.repeat(21);
    expect(parse(`lunch 50k #${long}`).tags).toEqual([]);
    expect(parse(`lunch 50k #${'a'.repeat(20)}`).tags).toHaveLength(1);
  });

  it('a tag made of digits is a tag, not an amount', () => {
    const result = parse('lunch 50k #2024');
    expect(result.tags).toEqual(['2024']);
    expect(result.amount).toBe(50000);
  });
});

describe('parseQuickAdd: the category', () => {
  it.each([
    ['coffee 35k', 'food'],
    ['Cà phê sữa 30k', 'food'],
    ['lunch 60k', 'food'],
    ['milk tea 45k', 'food'],
    ['grab to the airport 120k', 'transport'],
    ['xăng 50k', 'transport'],
    ['shopee order 200k', 'shopping'],
    ['electricity 800k', 'bills'],
    ['wifi 250k', 'bills'],
    ['netflix 260k', 'fun'],
    ['salary 15tr', 'salary'],
    ['lương 12tr', 'salary'],
    ['bonus 2tr', 'other'],
  ])('guesses the category of "%s"', (text, id) => {
    expect(parse(text).categoryId).toBe(id);
  });

  it('matches a whole word only ("tea" is not in "steam")', () => {
    expect(parse('steam 100k').categoryId).toBeNull();
    expect(parse('tea 20k').categoryId).toBe('food');
  });

  it('guesses nothing for an unknown word', () => {
    expect(parse('zzz 35k').categoryId).toBeNull();
    expect(parse('35k').categoryId).toBeNull();
  });

  it('does not use the tags to guess', () => {
    expect(parse('zzz 35k #coffee').categoryId).toBeNull();
  });

  it('uses the name of one of the user\'s own categories first', () => {
    const mine = [...categories, { _id: 'pets', name: 'Pets', type: 'expense' }, { _id: 'gym', name: 'Gym', type: 'expense' }];
    expect(parse('pets 300k', { categories: mine }).categoryId).toBe('pets');
    expect(parse('GYM monthly 400k', { categories: mine }).categoryId).toBe('gym');
  });

  it('a category name wins over a keyword', () => {
    const mine = [...categories, { _id: 'coffee', name: 'Coffee', type: 'expense' }];
    expect(parse('coffee 35k', { categories: mine }).categoryId).toBe('coffee');
  });

  it('finds a name made of several words', () => {
    expect(parse('other income 1tr').categoryId).toBe('other');
  });

  it('guesses nothing when the user no longer has the default category', () => {
    const withoutFood = categories.filter((c) => c._id !== 'food');
    expect(parse('coffee 35k', { categories: withoutFood }).categoryId).toBeNull();
  });

  it('guesses nothing without categories', () => {
    expect(parse('coffee 35k', { categories: [] }).categoryId).toBeNull();
  });

  it('does not take a category of the other type for a keyword', () => {
    const salaryAsExpense = [{ _id: 'x', name: 'Salary', type: 'expense' }];
    // the name matches, so it is found by name; the keyword table alone would need an income "Salary"
    expect(parse('salary 15tr', { categories: salaryAsExpense }).categoryId).toBe('x');
    expect(parse('bonus 1tr', { categories: [{ _id: 'y', name: 'Other Income', type: 'expense' }] }).categoryId).toBeNull();
  });
});

describe('parseQuickAdd: the note', () => {
  it('is what is left after the amount, the day and the tags', () => {
    expect(parse('Lunch  with   Nam 85k yesterday #work').note).toBe('Lunch with Nam');
  });

  it('is empty when the text is only an amount', () => {
    expect(parse('35k').note).toBe('');
  });
});
