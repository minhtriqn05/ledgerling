import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon.jsx';
import styles from './TagInput.module.css';

export const MAX_TAGS = 5;
const TAG_REGEX = /^[a-z0-9-]{1,20}$/;
const MAX_SUGGESTIONS = 6;

// Typed text -> the tag it means: trimmed, lower case, without a leading #  ("#Work " -> "work")
export function cleanTag(text) {
  return text.trim().replace(/^#/, '').toLowerCase();
}

// Tags of a transaction: the chosen ones as chips, a box to type a new one, and the tags used before as suggestions.
// value: array of tags, onChange(nextArray), suggestions: [{ tag, count }] from GET /tags (most used first).
// A tag is added with Enter, comma or space, or when the box loses focus (so a tag typed just before
// pressing Save is not lost). Backspace in the empty box removes the last tag.
export default function TagInput({ id, value, onChange, suggestions = [], disabled = false }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const full = value.length >= MAX_TAGS;

  function addTag(raw) {
    const tag = cleanTag(raw);
    if (!tag) return;
    if (!TAG_REGEX.test(tag)) {
      setError(t('tags.invalid'));
      return;
    }
    setError('');
    setText('');
    if (value.includes(tag)) return; // already there, nothing to add
    if (full) return;
    onChange([...value, tag]);
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      // Enter must not submit the form; comma and space are not part of a tag
      event.preventDefault();
      addTag(text);
    } else if (event.key === 'Backspace' && text === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const typed = cleanTag(text);
  const shown = suggestions
    .filter((s) => !value.includes(s.tag) && s.tag.includes(typed))
    .slice(0, MAX_SUGGESTIONS);

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        {value.map((tag) => (
          <span key={tag} className={styles.chip}>
            #{tag}
            <button
              type="button"
              className={styles.remove}
              aria-label={t('tags.remove', { tag })}
              onClick={() => removeTag(tag)}
              disabled={disabled}
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className={styles.input}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(text)}
          placeholder={full ? t('tags.upTo', { max: MAX_TAGS }) : value.length === 0 ? t('tags.placeholder') : ''}
          maxLength={21}
          autoComplete="off"
          disabled={disabled || full}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!full && shown.length > 0 && (
        <div className={styles.suggestions} aria-label={t('tags.suggestions')}>
          {shown.map((s) => (
            <button
              key={s.tag}
              type="button"
              className={styles.suggestion}
              // onMouseDown: the box must not lose focus (and add the half-typed text) before the click lands
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addTag(s.tag)}
              disabled={disabled}
            >
              #{s.tag}
              <span>{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
