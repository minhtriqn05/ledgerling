import { motion, useReducedMotion } from 'motion/react';

// One item of a list that appears shortly after the one before it (a stagger).
//   <Reveal as="li" index={i}>...</Reveal>   as: the HTML element to render, index: its place in the list.
// The delay stops growing after a few items, so a long list never makes anyone wait: 180ms + 220ms is the most.
// With prefers-reduced-motion it is a plain element.
const STEP = 0.03;
const MAX_DELAY = 0.18;

export default function Reveal({ as = 'div', index = 0, children, ...rest }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = as;
    return <Tag {...rest}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * STEP, MAX_DELAY), ease: [0.22, 0.61, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
