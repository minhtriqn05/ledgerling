import { useId } from 'react';
import styles from './Logo.module.css';

// The Ledgerling logo: an L holding the ruled lines of a ledger page, plus the name drawn as plain strokes,
// so no font is involved. Design notes: docs/brand/README.md. The word takes the CSS `color` of its parent.
// size: the height of the mark in px. showName: false gives the mark alone.
// inverse: a white tile with a colored L, for a background in the brand gradient.
const WORDMARK_WIDTH = 120.1;
const WORDMARK_PATH =
  'M1.5 3V22H10M14.2 16H26.2A6 6 0 1 0 24.5 20.2M29.4 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M41.4 3V22M44.6 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M56.6 10V23.5A6 6 0 0 1 46 27M59.8 16H71.8A6 6 0 1 0 70.1 20.2M75 10V22M75 15.5C75 12 77.6 10 81.2 10.2M83.8 3V22M88.6 10V22M88.6 4.6v.01M93.4 10V22M93.4 15.5A5 5 0 0 1 103.4 15.5V22M106.6 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M118.6 10V23.5A6 6 0 0 1 108 27';

export default function Logo({ size = 32, showName = true, inverse = false }) {
  const gradientId = useId();

  return (
    <span className={styles.logo} role="img" aria-label="Ledgerling">
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stopColor="var(--color-hero-from)" />
            <stop offset="1" stopColor="var(--color-hero-to)" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={inverse ? 'var(--color-on-primary)' : `url(#${gradientId})`} />
        <path d="M21 13V45H49" fill="none" stroke={inverse ? `url(#${gradientId})` : 'var(--color-on-primary)'} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 16H49M34 25H49M34 34H49" stroke={inverse ? 'var(--color-income)' : 'var(--color-logo-accent)'} strokeWidth="5" strokeLinecap="round" />
      </svg>
      {showName && (
        <svg
          className={styles.word}
          viewBox={`0 0 ${WORDMARK_WIDTH} 32`}
          height={size * 0.82}
          width={(size * 0.82 * WORDMARK_WIDTH) / 32}
          aria-hidden="true"
        >
          <path d={WORDMARK_PATH} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
