import { useEffect } from 'react';

// For an endless decoration (the aurora of a hero, the turning logo): while the element is out of the window it gets
// the attribute data-offscreen, and its CSS pauses its animations (animation-play-state: paused). Nobody sees it, so
// the GPU stops drawing it; it goes on from the same place as soon as a part of it is in the window again.
// The attribute is set on the element itself, so React does not render again.
//   const ref = useRef(null);
//   usePauseOffscreen(ref);
//   <span ref={ref} className={styles.aurora}>...</span>      CSS: .aurora[data-offscreen] .blob { animation-play-state: paused; }
export function usePauseOffscreen(ref) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      element.toggleAttribute('data-offscreen', !entry.isIntersecting);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      element.removeAttribute('data-offscreen');
    };
  }, [ref]);
}
