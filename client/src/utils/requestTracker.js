// How many API requests are on their way right now: api/axios.js counts them, the thin bar at the top of the page
// (components/TopProgress) reads the number through useSyncExternalStore.
let active = 0;
const listeners = new Set();

function publish() {
  listeners.forEach((listener) => listener());
}

export function requestStarted() {
  active += 1;
  publish();
}

export function requestFinished() {
  active = Math.max(0, active - 1);
  publish();
}

export function getActiveRequests() {
  return active;
}

export function subscribeToRequests(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
