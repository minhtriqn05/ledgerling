import { useTranslation } from 'react-i18next';
import { ICON_GROUPS, selectedIconName } from '../../utils/categoryIcons.js';
import styles from './IconPicker.module.css';

// The icons a category can use, in groups, plus "Auto" (no icon stored: the app guesses one from the name).
// value: the stored icon (a name, an older emoji, or null). onChange(name | null). --tone colors the selected icon.
export default function IconPicker({ value, onChange, color, disabled = false }) {
  const { t } = useTranslation();
  const selected = selectedIconName(value);

  return (
    <div className={styles.picker} style={{ '--tone': color }}>
      <button
        type="button"
        className={`${styles.auto} ${value === null ? styles.selected : ''}`}
        aria-pressed={value === null}
        disabled={disabled}
        onClick={() => onChange(null)}
      >
        {t('icons.auto')}
      </button>

      <div className={styles.groups}>
        {ICON_GROUPS.map((group) => (
          <div key={group.id} className={styles.group} role="group" aria-label={t(`icons.groups.${group.id}`)}>
            <span className={styles.groupTitle}>{t(`icons.groups.${group.id}`)}</span>
            <div className={styles.grid}>
              {group.icons.map(({ name, Icon }) => {
                const isSelected = name === selected;
                return (
                  <button
                    key={name}
                    type="button"
                    className={`${styles.icon} ${isSelected ? styles.selected : ''}`}
                    aria-label={name}
                    aria-pressed={isSelected}
                    disabled={disabled}
                    data-testid={`icon-${name}`}
                    onClick={() => onChange(name)}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
