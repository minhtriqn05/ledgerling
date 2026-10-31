import { avatarTone, initialOf } from '../../utils/avatar.js';
import styles from './Avatar.module.css';

// A round avatar: the first letter of the name on a soft color that depends on the name.
// size: 'sm' (the menu) or 'lg' (the profile card). It is decoration, the name is always written next to it.
export default function Avatar({ name, size = 'sm', className = '' }) {
  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${className}`}
      style={{ '--tone': `var(--accent-${avatarTone(name)})` }}
      aria-hidden="true"
    >
      {initialOf(name)}
    </span>
  );
}
