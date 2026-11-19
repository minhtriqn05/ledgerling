import { describe, expect, it, vi } from 'vitest';
import { watchServiceWorkerUpdates } from './swUpdate.js';

// A stand-in for navigator.serviceWorker and document: they only need events
function fakeServiceWorker({ controller = null, update = vi.fn().mockResolvedValue(undefined) } = {}) {
  const target = new window.EventTarget();
  target.controller = controller;
  target.getRegistration = vi.fn().mockResolvedValue({ update });
  return { sw: target, update };
}

function fakeDocument(state = 'visible') {
  const target = new window.EventTarget();
  target.visibilityState = state;
  return target;
}

describe('watchServiceWorkerUpdates', () => {
  it('loads the page again when a new version takes over a page that had one', () => {
    const { sw } = fakeServiceWorker({ controller: {} });
    const reload = vi.fn();
    watchServiceWorkerUpdates(sw, fakeDocument(), reload);
    sw.dispatchEvent(new Event('controllerchange'));
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the first install', () => {
    const { sw } = fakeServiceWorker({ controller: null });
    const reload = vi.fn();
    watchServiceWorkerUpdates(sw, fakeDocument(), reload);
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('looks for a new version when the app comes back on screen', async () => {
    const { sw, update } = fakeServiceWorker({ controller: {} });
    const doc = fakeDocument('hidden');
    watchServiceWorkerUpdates(sw, doc, vi.fn());
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(sw.getRegistration).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it('works without service workers and can be stopped', () => {
    expect(watchServiceWorkerUpdates(undefined)).toBeTypeOf('function');
    const { sw } = fakeServiceWorker({ controller: {} });
    const reload = vi.fn();
    const stop = watchServiceWorkerUpdates(sw, fakeDocument(), reload);
    stop();
    sw.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });
});
