import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

// A number that counts from its last value to the new one in 400ms (the Dashboard amounts).
//   <CountUp value={1250000} format={formatVnd} />   format turns the number into the text to show.
// With prefers-reduced-motion the final number shows at once.
export default function CountUp({ value, format }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration: 0.4,
      ease: [0.22, 0.61, 0.36, 1],
      onUpdate: (latest) => {
        from.current = latest;
        setShown(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return format(shown);
}
