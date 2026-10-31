import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import styles from './Popover.module.css';

const EASE = [0.22, 0.61, 0.36, 1];
const GAP = 6; // between the anchor and the panel
const MARGIN = 8; // the panel keeps this distance from the edges of the window

// Where the panel goes: under the anchor, or above it when there is more room there.
// anchor: the anchor's getBoundingClientRect(); size: { width, height } of the panel's content.
export function placePanel(anchor, size, viewport, { matchWidth = false, align = 'start' } = {}) {
  const below = viewport.height - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - GAP - MARGIN;
  const up = size.height > below && above > below;
  const width = matchWidth ? Math.max(size.width, anchor.width) : size.width;
  const wanted = align === 'end' ? anchor.right - width : anchor.left;
  const left = Math.max(MARGIN, Math.min(wanted, viewport.width - width - MARGIN));
  const maxHeight = up ? above : below;
  const top = up ? anchor.top - GAP - Math.min(size.height, maxHeight) : anchor.bottom + GAP;
  return { top, left, minWidth: matchWidth ? anchor.width : undefined, maxHeight, up };
}

// A floating panel next to an element (the menu of a Select, the calendar of a DatePicker).
// It is a popover, which the browser draws in the "top layer": above an open <dialog> and never cut off by a
// scrolling parent. It follows its anchor when the page scrolls and closes on a click outside both of them.
export default function Popover({ open, ...rest }) {
  return <AnimatePresence>{open && <Panel {...rest} />}</AnimatePresence>;
}

function Panel({ anchorRef, onClose, matchWidth, align, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [place, setPlace] = useState(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  useLayoutEffect(() => {
    const panel = ref.current;
    // jsdom has no popovers; StrictMode runs this twice, and showPopover() on an open popover throws
    if (panel.showPopover && !panel.matches(':popover-open')) panel.showPopover();

    function update() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const size = { width: panel.offsetWidth, height: panel.scrollHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setPlace(placePanel(anchor.getBoundingClientRect(), size, viewport, { matchWidth, align }));
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true); // true: also when a scrolling parent moves
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, matchWidth, align]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (ref.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      latestClose.current();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef]);

  return (
    <motion.div
      ref={ref}
      popover="manual"
      className={`${styles.panel} ${className}`}
      data-placement={place?.up ? 'top' : 'bottom'}
      style={{
        top: place?.top,
        left: place?.left,
        minWidth: place?.minWidth,
        maxHeight: place?.maxHeight,
        transformOrigin: place?.up ? 'bottom center' : 'top center',
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: EASE } }}
      transition={{ duration: 0.18, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
