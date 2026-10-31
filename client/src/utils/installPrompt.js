import { useSyncExternalStore } from 'react';

// "Install app". Chrome and Edge offer the install through the event beforeinstallprompt, which comes once, soon after
// the page loads and maybe long before the Settings page opens. So this file listens from the start (main.jsx imports it)
// and keeps the event for the button. Browsers without the event (Safari, Firefox) get written instructions.
//
// The state is one of:
//   'ready'      the browser offered the install, promptInstall() shows its dialog
//   'manual'     the browser offers nothing: show the Add to Home Screen instructions
//   'installed'  the app is already open as an installed app, or was installed just now

let offer = null;
let installed = false;
const subscribers = new Set();

function changed() {
  subscribers.forEach((notify) => notify());
}

export function resetInstallPrompt() {
  offer = null;
  installed = false;
  changed();
}

window.addEventListener('beforeinstallprompt', (event) => {
  // Keeps the browser's own banner away, so the install happens when the person asks for it
  event.preventDefault();
  offer = event;
  changed();
});

window.addEventListener('appinstalled', () => {
  offer = null;
  installed = true;
  changed();
});

function currentState() {
  if (installed || window.matchMedia?.('(display-mode: standalone)').matches) return 'installed';
  return offer ? 'ready' : 'manual';
}

function subscribe(notify) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, currentState);
}

// Shows the browser's install dialog. The event works only once; whatever the answer was, the offer is used up.
export async function promptInstall() {
  if (!offer) return;
  const used = offer;
  await used.prompt();
  await used.userChoice;
  if (offer === used) offer = null;
  changed();
}
