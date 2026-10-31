import { useTranslation } from 'react-i18next';
import { passwordStrength } from '../../utils/passwordStrength.js';
import styles from './StrengthMeter.module.css';

// Three bars under the new password: Weak (1 bar), Medium (2), Strong (3). The word is always written, so the
// color is never the only signal. Nothing is shown while the field is empty.
export default function StrengthMeter({ password }) {
  const { t } = useTranslation();
  const { level, score } = passwordStrength(password);
  if (!level) return null;

  return (
    <div className={`${styles.meter} ${styles[level]}`} data-level={level}>
      <div className={styles.bars} aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={`${styles.bar} ${bar <= score ? styles.filled : ''}`} />
        ))}
      </div>
      <p className={styles.label} role="status">
        {t('settings.password.strength')}: <strong>{t(`settings.password.${level}`)}</strong>
      </p>
    </div>
  );
}
