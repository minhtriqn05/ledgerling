import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Avatar from './Avatar.jsx';
import { presetAvatarUrl } from '../../utils/avatarAssets.js';

// A 1x1 WebP is enough: the Avatar only checks that the text looks like a data URL of a photo
const PHOTO = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

describe('Avatar', () => {
  it('shows the first letter of the name, hidden from screen readers', () => {
    const { container } = render(<Avatar name="minh tri" />);
    const avatar = container.firstChild;

    expect(avatar).toHaveTextContent('M');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveAttribute('data-avatar', 'initial');
  });

  it('takes its color from the name', () => {
    const { container, rerender } = render(<Avatar name="Anna" />);
    const first = container.firstChild.style.getPropertyValue('--tone');
    expect(first).toMatch(/^var\(--accent-(sky|coral|teal|sun|periwinkle|mint)\)$/);

    rerender(<Avatar name="Anna" />);
    expect(container.firstChild.style.getPropertyValue('--tone')).toBe(first);
  });

  it('draws a ready-made avatar instead of the letter', () => {
    const { container } = render(<Avatar name="Tri" avatar={{ type: 'preset', value: 'panda' }} />);

    expect(container.firstChild).toHaveAttribute('data-avatar', 'preset');
    // Vite may turn a small drawing into a data URL, so the address is compared with the one the app itself gives
    expect(container.querySelector('img')).toHaveAttribute('src', presetAvatarUrl('panda'));
    expect(presetAvatarUrl('panda')).not.toBe(presetAvatarUrl('cat'));
    expect(container.firstChild).not.toHaveTextContent('T');
  });

  it('draws an uploaded photo', () => {
    const { container } = render(<Avatar name="Tri" avatar={{ type: 'upload', value: PHOTO }} />);

    expect(container.firstChild).toHaveAttribute('data-avatar', 'upload');
    expect(container.querySelector('img')).toHaveAttribute('src', PHOTO);
  });

  it('falls back to the letter for an unknown id or a value that is not a photo', () => {
    for (const avatar of [
      { type: 'preset', value: 'not-an-avatar' },
      { type: 'upload', value: 'https://example.com/x.png' },
      { type: 'upload', value: 'data:image/svg+xml;base64,PHN2Zy8+' },
      { type: 'other', value: 'cat' },
      null,
    ]) {
      const { container, unmount } = render(<Avatar name="Tri" avatar={avatar} />);
      expect(container.querySelector('img')).toBeNull();
      expect(container.firstChild).toHaveTextContent('T');
      unmount();
    }
  });
});
