import { useTranslation } from 'react-i18next';
import { EMOJI_CHOICES } from '../../utils/emoji.js';
import styles from './EmojiPicker.module.css';

// A grid of about 40 emoji to choose a category icon from, plus "None". No library: the list is in utils/emoji.js.
// value: the chosen emoji, or null. onChange(emoji | null).
export default function EmojiPicker({ value, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div className={styles.picker} role="group" aria-label={t('common.icon')}>
      <button
        type="button"
        className={`${styles.none} ${value === null ? styles.selected : ''}`}
        aria-pressed={value === null}
        disabled={disabled}
        onClick={() => onChange(null)}
      >
        {t('icons.none')}
      </button>
      <div className={styles.grid}>
        {EMOJI_CHOICES.map((emoji) => {
          const selected = emoji === value;
          return (
            <button
              key={emoji}
              type="button"
              className={`${styles.emoji} ${selected ? styles.selected : ''}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(emoji)}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
