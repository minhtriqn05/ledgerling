import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centeredOffset,
  clampOffset,
  cropRect,
  loadImage,
  photoScale,
  renderAvatar,
  zoomAround,
} from '../../utils/avatarImage.js';
import Alert from '../../components/Alert/Alert.jsx';
import Button from '../../components/Button/Button.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import styles from './AvatarCropDialog.module.css';

// The side of the square crop box on the screen, in pixels (the .viewport in the CSS has the same size)
const VIEW_SIZE = 240;
// An arrow key moves the photo by this many pixels
const KEY_STEP = 12;

// Step 2 of "Upload photo": the picked file is shown in a square box that can be dragged and zoomed. The round shape
// that is left clear is what the avatar will look like. "Use this photo" shrinks the square to 256x256 (WebP) in the
// browser and calls onSave(dataUrl); the dialog stays open and shows the error if the save fails.
export default function AvatarCropDialog({ file, onSave, onClose }) {
  const { t } = useTranslation();
  const zoomId = useId();
  const [loaded, setLoaded] = useState(null); // { image, url } once the file is read
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const drag = useRef(null);

  // Read the file once. The object URL is released when the dialog closes.
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    loadImage(file)
      .then(({ image, url }) => {
        objectUrl = url;
        if (cancelled) return URL.revokeObjectURL(url);
        setLoaded({ image, url });
        setOffset(centeredOffset({ width: image.naturalWidth, height: image.naturalHeight, viewSize: VIEW_SIZE }));
      })
      .catch(() => {
        if (!cancelled) setError(t('avatar.errors.unreadable'));
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, t]);

  const size = loaded && { width: loaded.image.naturalWidth, height: loaded.image.naturalHeight, viewSize: VIEW_SIZE };
  const scale = size ? photoScale({ ...size, zoom }) : 1;

  function moveTo(x, y) {
    setOffset(clampOffset({ ...size, zoom, x, y }));
  }

  function handleZoom(event) {
    const nextZoom = Number(event.target.value);
    setOffset(zoomAround({ ...size, zoom, nextZoom, ...offset }));
    setZoom(nextZoom);
  }

  function handlePointerDown(event) {
    if (!loaded || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, x: offset.x, y: offset.y };
  }

  function handlePointerMove(event) {
    if (!drag.current) return;
    moveTo(drag.current.x + event.clientX - drag.current.startX, drag.current.y + event.clientY - drag.current.startY);
  }

  function handlePointerEnd() {
    drag.current = null;
  }

  // The arrow keys move the photo, so the box can be used without a mouse
  function handleKeyDown(event) {
    const moves = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] };
    const move = moves[event.key];
    if (!move || !loaded) return;
    event.preventDefault();
    moveTo(offset.x + move[0], offset.y + move[1]);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const dataUrl = renderAvatar(loaded.image, cropRect({ ...size, zoom, ...offset }));
      await onSave(dataUrl);
    } catch (err) {
      // onSave shows the API error itself (it throws the translated text); a failure of the canvas has no message
      setError(err?.message && err.message !== 'too-large' ? err.message : t('avatar.errors.unreadable'));
      setSaving(false);
    }
  }

  return (
    <Modal title={t('avatar.cropTitle')} onClose={onClose} busy={saving}>
      <p className={styles.help}>{t('avatar.cropHelp')}</p>

      <div className={styles.stage}>
        <div
          className={styles.viewport}
          style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
          role="group"
          tabIndex={0}
          aria-label={t('avatar.cropArea')}
          data-testid="avatar-crop-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown}
        >
          {loaded && (
            <img
              src={loaded.url}
              alt=""
              draggable="false"
              className={styles.photo}
              style={{
                width: size.width,
                height: size.height,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
            />
          )}
          {/* The part outside the circle is dimmed: what stays clear is the avatar */}
          <span className={styles.mask} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.zoom}>
        <label htmlFor={zoomId}>{t('avatar.zoom')}</label>
        <input
          id={zoomId}
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step="0.01"
          value={zoom}
          disabled={!loaded || saving}
          onChange={handleZoom}
        />
      </div>

      {error && <Alert>{error}</Alert>}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button needsNetwork onClick={handleSave} disabled={!loaded || saving} data-autofocus>
          {saving ? t('common.saving') : t('avatar.usePhoto')}
        </Button>
      </div>
    </Modal>
  );
}
