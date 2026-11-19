// A new deploy reaches every open copy of the app, the installed one too.
// The service worker of the build (vite.config.js: registerType autoUpdate) takes over as soon as a new version is
// downloaded, but the page on screen still runs the code of the old one: without this, a reload showed the old version
// once more (the old service worker answered it), and only the next reload showed the new one.
// - When a new service worker takes over a page that already had one, the page loads again, now from the new version.
//   The first install (no service worker before) changes nothing on screen.
// - When the app comes back on screen (another tab, an installed app reopened from the background), the browser is
//   asked to look for a new version; a page that stays open for days gets it too.
export function watchServiceWorkerUpdates(sw = navigator.serviceWorker, doc = document, reload = () => window.location.reload()) {
  if (!sw) return () => {};
  const hadController = Boolean(sw.controller);
  let reloading = false;

  function handleControllerChange() {
    if (!hadController || reloading) return;
    reloading = true;
    reload();
  }

  function handleVisibility() {
    if (doc.visibilityState !== 'visible') return;
    sw.getRegistration?.()
      .then((registration) => registration?.update())
      .catch(() => {});
  }

  sw.addEventListener('controllerchange', handleControllerChange);
  doc.addEventListener('visibilitychange', handleVisibility);
  return () => {
    sw.removeEventListener('controllerchange', handleControllerChange);
    doc.removeEventListener('visibilitychange', handleVisibility);
  };
}
