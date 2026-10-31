// npm run i18n:check
// Compares every locale file with en.json (the source language) and exits with 1 when something is wrong:
//  - keys that are missing from a language, or that only exist there
//  - {{placeholders}} that differ from the English text
//  - keys used in the code as t('some.key') that are not in en.json
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const localesDir = join(root, 'locales');
const SOURCE = 'en.json';

// { a: { b: 'x' } } -> { 'a.b': 'x' }
function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object') flatten(child, path, out);
    else out[path] = child;
  }
  return out;
}

const placeholders = (text) => [...String(text).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1]).sort();

function read(file) {
  return flatten(JSON.parse(readFileSync(join(localesDir, file), 'utf8')));
}

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // The style guide is a dev-only page and stays in English
      if (name !== 'styleGuide' && name !== 'locales') sourceFiles(path, out);
    } else if (/\.jsx?$/.test(name) && !/\.test\.jsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const english = read(SOURCE);
const englishKeys = Object.keys(english);
const problems = [];

for (const file of readdirSync(localesDir).filter((name) => name.endsWith('.json') && name !== SOURCE)) {
  const language = read(file);
  for (const key of englishKeys) {
    if (!(key in language)) {
      problems.push(`${file}: missing "${key}"`);
    } else if (placeholders(english[key]).join() !== placeholders(language[key]).join()) {
      problems.push(`${file}: "${key}" has other placeholders than English: ${placeholders(language[key]).join(', ') || 'none'}`);
    } else if (!String(language[key]).trim()) {
      problems.push(`${file}: "${key}" is empty`);
    }
  }
  for (const key of Object.keys(language)) {
    if (!(key in english)) problems.push(`${file}: extra "${key}"`);
  }
}

// Plural keys are written as key_one / key_other, and used in the code as t('key', { count }).
const usedKeyExists = (key) => key in english || `${key}_other` in english;
for (const path of sourceFiles(root)) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/(?:\b(?:t|i18n\.t)\(\s*'|i18nKey=")([\w.]+)/g)) {
    if (!usedKeyExists(match[1])) problems.push(`${path.slice(root.length + 1)}: uses "${match[1]}", which is not in ${SOURCE}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error(`\ni18n:check found ${problems.length} problem(s).`);
  process.exit(1);
}

const languages = readdirSync(localesDir).filter((name) => name.endsWith('.json')).length;
console.log(`i18n:check OK: ${languages} languages, ${englishKeys.length} keys each.`);
