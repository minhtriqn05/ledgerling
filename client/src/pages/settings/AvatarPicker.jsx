import { useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { removeAvatar, setAvatar } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AVATAR_GROUPS, AVATAR_GROUP_KEYS, groupOfAvatar } from '../../utils/avatarCatalog.js';
import { presetAvatarUrl } from '../../utils/avatarAssets.js';
import { ACCEPTED_TYPES, MAX_SOURCE_BYTES, isAcceptedImage } from '../../utils/avatarImage.js';
import Alert from '../../components/Alert/Alert.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import Button from '../../components/Button/Button.jsx';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl.jsx';
import AvatarCropDialog from './AvatarCropDialog.jsx';
import styles from './AvatarPicker.module.css';

// "Your avatar" in Settings > Profile: a big preview, a grid of the 32 ready-made avatars (four tabs), Upload photo and
// Remove. A ready-made avatar is saved the moment it is clicked; a photo is cropped in a dialog first. The preview and
// the menu change at once because the saved user goes into AuthContext.
// The shared demo account keeps its one fixed avatar (the API answers 403), so it only gets the preview here.
export default function AvatarPicker() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const fileInput = useRef(null);
  const [group, setGroup] = useState(() => groupOfAvatar(user.avatar?.type === 'preset' ? user.avatar.value : null) ?? AVATAR_GROUP_KEYS[0]);
  // What the preview shows while a request is on its way, so a click feels instant
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null); // the photo that is being cropped
  const busy = pending !== null;
  const shown = pending ? (pending === 'removed' ? null : pending) : user.avatar;

  async function save(avatar) {
    setError('');
    setPending(avatar);
    try {
      updateUser(await setAvatar(avatar));
      toast.success(t('avatar.saved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  async function handleRemove() {
    setError('');
    setPending('removed');
    try {
      updateUser(await removeAvatar());
      toast.success(t('avatar.removed'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  function handleFile(event) {
    const picked = event.target.files?.[0];
    // The same file can be picked twice in a row
    event.target.value = '';
    if (!picked) return;

    if (!isAcceptedImage(picked)) return setError(t('avatar.errors.type'));
    if (picked.size > MAX_SOURCE_BYTES) return setError(t('avatar.errors.tooBig'));
    setError('');
    setFile(picked);
  }

  // Called by the crop dialog with the finished 256x256 picture. The dialog shows the text of a thrown error.
  async function handleCropped(dataUrl) {
    try {
      updateUser(await setAvatar({ type: 'upload', value: dataUrl }));
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    setFile(null);
    toast.success(t('avatar.saved'));
  }

  const hasAvatar = Boolean(user.avatar);

  return (
    <div className={styles.picker}>
      <div className={styles.top}>
        <Avatar name={user.name} avatar={shown} size="xl" />
        <div className={styles.topText}>
          <h3 className={styles.title}>{t('avatar.title')}</h3>
          <p className={styles.text}>{user.isDemo ? t('avatar.demoText') : t('avatar.text')}</p>
          {!user.isDemo && (
            <div className={styles.buttons}>
              <Button needsNetwork variant="secondary" icon="upload" onClick={() => fileInput.current.click()} disabled={busy}>
                {t('avatar.upload')}
              </Button>
              <Button needsNetwork variant="secondary" onClick={handleRemove} disabled={busy || !hasAvatar}>
                {t('avatar.remove')}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className={styles.fileInput}
                data-testid="avatar-file"
                aria-label={t('avatar.upload')}
                tabIndex={-1}
                onChange={handleFile}
              />
            </div>
          )}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {!user.isDemo && (
        <>
          <SegmentedControl
            label={t('avatar.groupsLabel')}
            value={group}
            onChange={setGroup}
            options={AVATAR_GROUP_KEYS.map((key) => ({ value: key, label: t(`avatar.groups.${key}`) }))}
          />
          <div className={styles.grid} role="radiogroup" aria-label={t(`avatar.groups.${group}`)}>
            {AVATAR_GROUPS[group].map((id) => {
              const selected = shown?.type === 'preset' && shown.value === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t(`avatar.names.${id}`)}
                  title={t(`avatar.names.${id}`)}
                  data-avatar-id={id}
                  className={`${styles.choice} ${selected ? styles.selected : ''}`}
                  disabled={busy}
                  onClick={() => save({ type: 'preset', value: id })}
                >
                  <img src={presetAvatarUrl(id)} alt="" draggable="false" />
                </button>
              );
            })}
          </div>
        </>
      )}

      <AnimatePresence>
        {file && <AvatarCropDialog key="crop" file={file} onSave={handleCropped} onClose={() => setFile(null)} />}
      </AnimatePresence>
    </div>
  );
}
