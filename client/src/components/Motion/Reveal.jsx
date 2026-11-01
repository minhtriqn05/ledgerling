import { motion, useReducedMotion } from 'motion/react';

// One item of a list that appears shortly after the one before it (a stagger).
//   <Reveal as="li" index={i}>...</Reveal>   as: the HTML element to render, index: its place in the list.
// The delay stops growing after a few items, so a long list never makes anyone wait: 180ms + 220ms is the most.
// onScroll: it waits until it scrolls into view (the sections of the landing page), and it only happens once.
// With prefers-reduced-motion it is a plain element.
const STEP = 0.03;
const MAX_DELAY = 0.18;
const HIDDEN = { opacity: 0, y: 8 };
const SHOWN = { opacity: 1, y: 0 };

export default function Reveal({ as = 'div', index = 0, onScroll = false, children, ...rest }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = as;
    return <Tag {...rest}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  const trigger = onScroll ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' } } : { animate: SHOWN };
  return (
    <MotionTag
      initial={onScroll ? { opacity: 0, y: 24 } : HIDDEN}
      {...trigger}
      transition={{ duration: onScroll ? 0.5 : 0.22, delay: Math.min(index * STEP, MAX_DELAY), ease: [0.22, 0.61, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
