// The endless decorations (the lights of the aurora in the heroes, the slow turn and the band of light of the logo, the
// caret of the landing page) keep the screen changing many times a second, also when nobody uses the page. After a
// while without any input they stop where they are, and the next input (mouse, touch, key, wheel, scroll, focus) lets
// them go on from the same place. The picture stays the same; a page left open then costs almost no processor time.
// The pause itself is CSS: html[data-idle] (Aurora.module.css, Logo.module.css, WelcomePage.module.css).
export const IDLE_AFTER_MS = 8000;

const INPUTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart', 'focusin'];

export function pauseDecorationsWhenIdle({ win = window, root = document.documentElement, idleAfter = IDLE_AFTER_MS, now = () => Date.now() } = {}) {
  let last = now();
  let timer = null;

  // Called when the time is up: idle, or wait the rest of the time since the last input
  function check() {
    timer = null;
    const rest = idleAfter - (now() - last);
    if (rest <= 0) root.setAttribute('data-idle', '');
    else timer = win.setTimeout(check, rest);
  }

  // Cheap enough for every mouse move: one timer for the whole time, no new timer per event
  function wake() {
    last = now();
    if (root.hasAttribute('data-idle')) root.removeAttribute('data-idle');
    if (!timer) timer = win.setTimeout(check, idleAfter);
  }

  for (const type of INPUTS) win.addEventListener(type, wake, { capture: true, passive: true });
  timer = win.setTimeout(check, idleAfter);

  return () => {
    for (const type of INPUTS) win.removeEventListener(type, wake, { capture: true });
    win.clearTimeout(timer);
    root.removeAttribute('data-idle');
  };
}
