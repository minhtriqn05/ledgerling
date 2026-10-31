import { avatarTone, initialOf } from '../../utils/avatar.js';
import { avatarSrc } from '../../utils/avatarAssets.js';
import styles from './Avatar.module.css';

// A round avatar. With `avatar` ({ type: 'preset' | 'upload', value } from the user) it shows the picture: one of the
// ready-made drawings or the user's own photo. Without one (or when the picture is not valid) it shows the first letter
// of the name on a soft color that depends on the name.
// size: 'xs' (a table row), 'sm' (the menu), 'lg' (the profile card) or 'xl' (the profile picker).
// It is decoration, the name is always written next to it.
export default function Avatar({ name, avatar, size = 'sm', className = '' }) {
  const src = avatarSrc(avatar);
  const classes = `${styles.avatar} ${styles[size]} ${src ? styles.picture : ''} ${className}`;

  return (
    <span className={classes} style={{ '--tone': `var(--accent-${avatarTone(name)})` }} aria-hidden="true" data-avatar={src ? avatar.type : 'initial'}>
      {src ? <img src={src} alt="" className={styles.image} draggable="false" /> : initialOf(name)}
    </span>
  );
}
