import { useId, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import styles from './Logo.module.css';

// The Ledgerling logo: an old Vietnamese coin, round outside and square inside, made of four glass L, plus the name
// drawn as plain strokes, so no font is involved. Design notes: docs/brand/README.md. The word takes the CSS `color` of its parent.
// It turns slowly all the time. The mouse opens it into its four L and spins it; a press tosses it (Logo.module.css).
// size: the height of the mark in px. showName: false gives the mark alone.
const WORDMARK_WIDTH = 120.1;
const WORDMARK_PATH =
  'M1.5 3V22H10M14.2 16H26.2A6 6 0 1 0 24.5 20.2M29.4 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M41.4 3V22M44.6 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M56.6 10V23.5A6 6 0 0 1 46 27M59.8 16H71.8A6 6 0 1 0 70.1 20.2M75 10V22M75 15.5C75 12 77.6 10 81.2 10.2M83.8 3V22M88.6 10V22M88.6 4.6v.01M93.4 10V22M93.4 15.5A5 5 0 0 1 103.4 15.5V22M106.6 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M118.6 10V23.5A6 6 0 0 1 108 27';

// One L: the quarter of the coin at the top left of the 64 x 64 box, with a corner of the square hole cut out.
// It is mirrored along its diagonal, and it reaches a little past the axes, so the glass of two L overlaps at each seam.
const BODY_PATH = 'M31.7 20.2H23.2A3 3 0 0 0 20.2 23.2V31.7H3.302A28.7 28.7 0 0 1 31.7 3.302Z';
const RIM_PATH = 'M3.175 28.816A29 29 0 0 1 28.816 3.175'; // the light along its round edge
const HOLE_EDGE_PATH = 'M20.4 31V21.6A1.2 1.2 0 0 1 21.6 20.4H31'; // the raised edge around the hole of a real coin
const COIN_PATH = 'M2 32a30 30 0 1 0 60 0a30 30 0 1 0 -60 0ZM22 22H42V42H22Z'; // the whole coin, for the light that sweeps over it

// Two gold L and two jade L, each opposite its twin: income and expense in balance.
// The gold comes first, so the jade lies over it at all four seams and the mirror lines of the coin hold.
const PIECES = [
  { angle: 0, tone: 'gold' },
  { angle: 180, tone: 'gold' },
  { angle: 90, tone: 'jade' },
  { angle: 270, tone: 'jade' },
];
const SHARDS = [0, 45, 90, 135, 180, 225, 270, 315];

// One flat picture of the coin. Three of them stacked give it its thickness. flat: only the plain shapes, for the middle one.
function CoinPlate({ id, className, flat = false, children }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      {PIECES.map(({ angle, tone }) => {
        const paint = flat ? `var(--logo-${tone}-edge)` : `url(#${id}-${tone})`;
        return (
          <g key={angle} transform={`rotate(${angle} 32 32)`}>
            <g className={styles.piece} data-piece={angle} data-tone={tone}>
              <path d={BODY_PATH} fill={paint} stroke={paint} strokeWidth="3.6" strokeLinejoin="round" />
              {!flat && (
                <>
                  <circle cx="16.5" cy="16.5" r="8.5" fill={`url(#${id}-shine)`} />
                  <path d={RIM_PATH} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.15" strokeLinecap="round" />
                  <path d={HOLE_EDGE_PATH} fill="none" stroke="var(--logo-light)" strokeOpacity="0.55" strokeWidth="0.8" strokeLinecap="round" />
                </>
              )}
            </g>
          </g>
        );
      })}
      {children}
    </svg>
  );
}

export default function Logo({ size = 32, showName = true }) {
  const id = useId();
  const reduced = useReducedMotion();
  const [tossing, setTossing] = useState(false);

  return (
    <span
      className={styles.logo}
      role="img"
      aria-label="Ledgerling"
      style={{ '--logo-size': `${size}px` }}
      onPointerDown={() => {
        if (!reduced) setTossing(true);
      }}
    >
      <span className={styles.mark} data-tossing={tossing || undefined}>
        <span className={styles.halo} />

        {/* Each group moves in its own way, and the moves add up: the toss, the flip and tilt of the mouse, the slow turn, the fast turn */}
        <span
          className={styles.toss}
          data-testid="logo-coin"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setTossing(false);
          }}
        >
          <span className={styles.tilt}>
            <span className={styles.drift}>
              <span className={styles.cruise}>
                <span className={styles.glow} />
                <CoinPlate id={id} className={styles.back} />
                <CoinPlate id={id} className={styles.edge} flat />
                <CoinPlate id={id} className={styles.front}>
                  <defs>
                    {['gold', 'jade'].map((tone) => (
                      <linearGradient key={tone} id={`${id}-${tone}`} gradientUnits="userSpaceOnUse" x1="8" y1="8" x2="23" y2="23">
                        <stop offset="0" stopColor={`var(--logo-${tone}-tip)`} />
                        <stop offset="0.55" stopColor={`var(--logo-${tone}-mid)`} />
                        <stop offset="1" stopColor={`var(--logo-${tone}-base)`} />
                      </linearGradient>
                    ))}
                    <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1="3" y1="32" x2="32" y2="3">
                      <stop offset="0" stopColor="var(--logo-light)" stopOpacity="0.15" />
                      <stop offset="0.5" stopColor="var(--logo-light)" stopOpacity="0.95" />
                      <stop offset="1" stopColor="var(--logo-light)" stopOpacity="0.15" />
                    </linearGradient>
                    <radialGradient id={`${id}-shine`}>
                      <stop offset="0" stopColor="var(--logo-light)" stopOpacity="0.42" />
                      <stop offset="1" stopColor="var(--logo-light)" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`${id}-sheen`}>
                      <stop offset="0" stopColor="var(--logo-light)" stopOpacity="0" />
                      <stop offset="0.5" stopColor="var(--logo-light)" stopOpacity="0.75" />
                      <stop offset="1" stopColor="var(--logo-light)" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${id}-coin`}>
                      <path d={COIN_PATH} clipRule="evenodd" />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${id}-coin)`}>
                    <g transform="rotate(24 32 32)">
                      <rect className={styles.sheen} x="0" y="-16" width="16" height="96" fill={`url(#${id}-sheen)`} />
                    </g>
                  </g>
                </CoinPlate>
              </span>
            </span>
          </span>
        </span>

        {/* What a press leaves behind: a ring at once, and small square chips when the coin lands */}
        {tossing && (
          <span className={styles.burst}>
            <span className={styles.ring} />
            <span className={styles.ring} />
            {SHARDS.map((angle) => (
              <span key={angle} className={styles.shard} style={{ '--shard': `${angle}deg` }} />
            ))}
          </span>
        )}
      </span>

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
