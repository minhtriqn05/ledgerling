// Reads a line typed in "Quick add" like "coffee 35k #work" or "salary 15tr yesterday".
// Nothing here talks to the server: it is plain text in, a plain object out (see quickAdd.test.js).
import { todayInput } from './vnDate.js';

const MAX_TAGS = 5;
const TAG_REGEX = /^[a-z0-9-]{1,20}$/;
const MAX_AMOUNT = 999_999_999_999; // the form allows 12 digits

// ----- Amount -----
// 35k, 1.2tr, 1,2tr, 2m, 35.000, 1,500,000, 35000đ ...
// A suffix multiplies: k = thousand, tr / m = million.
const MULTIPLIERS = { k: 1e3, nghin: 1e3, 'nghìn': 1e3, tr: 1e6, m: 1e6, trieu: 1e6, 'triệu': 1e6 };
const AMOUNT_REGEX = /^(\d+(?:[.,]\d+)*)(k|tr|m|nghin|nghìn|trieu|triệu)?(?:đ|₫|vnd)?$/i;

// "1.2tr" -> { amount: 1200000, strong: true }, "35.000" -> { amount: 35000, strong: true }, "x" -> null.
// strong = it clearly looks like money (a suffix, a thousands mark or at least 1000). A bare small number
// like the 2 in "2 coffees 35k" is weak: a strong one wins over it.
function parseAmount(token) {
  const match = AMOUNT_REGEX.exec(token);
  if (!match) return null;

  const parts = match[1].split(/[.,]/);
  const suffix = match[2]?.toLowerCase();
  let amount;

  if (suffix) {
    // With a suffix, one "." or "," is a decimal mark: 1.2tr and 1,2tr are both 1.2 million.
    if (parts.length > 2) return null;
    amount = Math.round(Number(parts.length === 2 ? `${parts[0]}.${parts[1]}` : parts[0]) * MULTIPLIERS[suffix]);
  } else if (parts.length === 1) {
    amount = Number(parts[0]);
  } else {
    // Without a suffix, "." and "," only group thousands: 35.000, 1,500,000. "35.5" is not an amount.
    const grouped = parts[0].length <= 3 && parts.slice(1).every((part) => part.length === 3);
    if (!grouped) return null;
    amount = Number(parts.join(''));
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  return { amount, strong: Boolean(suffix) || parts.length > 1 || amount >= 1000 };
}

// ----- Date -----
// today, yesterday, dd/mm, dd/mm/yyyy. Returns "YYYY-MM-DD" or null.
function shiftDay(day, delta) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta)).toISOString().slice(0, 10);
}

function realDay(year, month, day) {
  const text = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(Date.UTC(year, month - 1, day));
  // 31/02 has the right shape but Date quietly turns it into 3 March
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

function parseDate(token, today) {
  const word = token.toLowerCase();
  if (word === 'today') return today;
  if (word === 'yesterday') return shiftDay(today, -1);

  const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(token);
  if (!match) return null;
  const [, day, month, yearText] = match;
  const thisYear = Number(today.slice(0, 4));

  if (yearText) {
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    return realDay(year, Number(month), Number(day));
  }
  // No year: this year, unless that day is still to come (an expense is not in the future), then last year
  const date = realDay(thisYear, Number(month), Number(day));
  if (!date) return null;
  return date > today ? realDay(thisYear - 1, Number(month), Number(day)) : date;
}

// ----- Category -----
// A simple word table for the default categories. A word is looked for as a whole word in the text.
// The category itself is found by NAME among the user's categories, so it works only when the user still has
// a category called like that (a renamed or deleted default simply guesses nothing).
const KEYWORDS = [
  {
    name: 'Food',
    type: 'expense',
    words: [
      'coffee', 'cafe', 'café', 'cà phê', 'ca phe', 'lunch', 'dinner', 'breakfast', 'brunch', 'pho', 'phở', 'bún',
      'cơm', 'restaurant', 'snack', 'tea', 'trà', 'milk tea', 'boba', 'pizza', 'burger', 'noodle', 'noodles', 'food',
      'drink', 'beer', 'bia', 'grocery', 'groceries', 'market', 'chợ',
    ],
  },
  {
    name: 'Transport',
    type: 'expense',
    words: ['grab', 'taxi', 'uber', 'bus', 'xe', 'xăng', 'petrol', 'fuel', 'parking', 'train', 'flight', 'toll', 'metro', 'gojek'],
  },
  {
    name: 'Shopping',
    type: 'expense',
    words: ['shopping', 'clothes', 'shirt', 'shoes', 'shoe', 'bag', 'shopee', 'lazada', 'tiki', 'amazon', 'mall', 'gift', 'book', 'books'],
  },
  {
    name: 'Bills',
    type: 'expense',
    words: ['electricity', 'electric', 'water', 'internet', 'wifi', 'rent', 'phone', 'bill', 'bills', 'tuition', 'insurance'],
  },
  {
    name: 'Entertainment',
    type: 'expense',
    words: ['movie', 'movies', 'cinema', 'game', 'games', 'netflix', 'spotify', 'concert', 'karaoke', 'party', 'youtube'],
  },
  { name: 'Salary', type: 'income', words: ['salary', 'lương', 'luong', 'payroll', 'wage', 'paycheck'] },
  {
    name: 'Other Income',
    type: 'income',
    words: ['bonus', 'thưởng', 'refund', 'interest', 'freelance', 'dividend', 'cashback'],
  },
];

// Lower case, punctuation turned into spaces, one space at both ends: " milk tea " (so " tea " matches whole words only)
function normalize(text) {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

function hasWord(normalizedText, word) {
  return normalizedText.includes(normalize(word));
}

// The user's category that the text points to, or null.
// 1. The text contains a category's own name ("transport" -> Transport), the longest name first.
// 2. The text contains a keyword of a default category ("coffee" -> Food) and the user has that category.
function guessCategory(note, categories) {
  const text = normalize(note);
  if (!text.trim()) return null;

  const byName = [...categories].sort((a, b) => b.name.length - a.name.length);
  const named = byName.find((category) => normalize(category.name).trim() && hasWord(text, category.name));
  if (named) return named;

  for (const group of KEYWORDS) {
    if (!group.words.some((word) => hasWord(text, word))) continue;
    const found = categories.find((c) => c.type === group.type && c.name.toLowerCase() === group.name.toLowerCase());
    if (found) return found;
  }
  return null;
}

// ----- Main -----
// parseQuickAdd('coffee 35k #work', { categories })
//   -> { amount: 35000, date: null, tags: ['work'], note: 'coffee', categoryId: '<id of Food>' }
// - amount: a whole number of VND, or null when no amount was found
// - date: "YYYY-MM-DD", or null when the text names no day (the form then uses today)
// - tags: lower case, valid, at most 5
// - note: the words that were not an amount, a day or a tag
// - categoryId: the guessed category, or null
// `today` ("YYYY-MM-DD") is a parameter only so tests do not depend on the clock.
export function parseQuickAdd(text, { categories = [], today = todayInput() } = {}) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const used = new Set(); // positions of the tokens that became an amount, a day or a tag

  const tags = [];
  const amounts = [];
  let date = null;

  tokens.forEach((token, index) => {
    if (token.startsWith('#')) {
      const tag = token.slice(1).toLowerCase();
      if (TAG_REGEX.test(tag) && tags.length < MAX_TAGS) {
        used.add(index);
        if (!tags.includes(tag)) tags.push(tag);
      }
      return;
    }

    if (date === null) {
      const day = parseDate(token, today);
      if (day) {
        date = day;
        used.add(index);
        return;
      }
    }

    const amount = parseAmount(token);
    if (amount) amounts.push({ index, ...amount });
  });

  // One amount is used: the last clear one, else the last bare number
  const chosen = [...amounts].reverse().find((a) => a.strong) ?? amounts[amounts.length - 1] ?? null;
  if (chosen) used.add(chosen.index);

  const note = tokens.filter((_, index) => !used.has(index)).join(' ');
  const category = guessCategory(note, categories);

  return {
    amount: chosen ? chosen.amount : null,
    date,
    tags,
    note,
    categoryId: category ? category._id : null,
  };
}
