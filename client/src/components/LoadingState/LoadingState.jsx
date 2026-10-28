import styles from './LoadingState.module.css';

// Centered, muted "Loading…" text. role="status" lets screen readers announce it.
// spacious: more room around the text, for a whole page instead of a card.
// fullScreen: fills the window, for the check of the stored session before any page shows.
export default function LoadingState({ children = 'Loading…', spacious = false, fullScreen = false }) {
  const className = [styles.loading, spacious && styles.spacious, fullScreen && styles.fullScreen]
    .filter(Boolean)
    .join(' ');

  return (
    <p className={className} role="status">
      {children}
    </p>
  );
}
