import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/axios.js';

// Loads data when the component mounts and again whenever `deps` change.
//   const { data, loading, error, reload, refresh } = useLoad(() => getMonthlyReport(month), [month]);
// - loading is true from the first render until the first answer (and again after a change of deps or reload()),
//   so the first render already shows "Loading…" and never a flash of an empty state.
// - error is the message to show (from getErrorMessage), or '' when the request worked.
// - reload() runs the request again, e.g. for a "Try again" button.
// - refresh() runs it in the background: no loading state, and if it fails the data on screen stays. For live updates.
// An outdated answer (the deps changed while the request was running, or StrictMode ran the effect twice) is ignored.
export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const silentNext = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const silent = silentNext.current;
    silentNext.current = false;
    if (!silent) setState((previous) => ({ ...previous, loading: true, error: '' }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (!cancelled && !silent) setState({ data: null, loading: false, error: getErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
    // loader is a new function on every render; only deps (and reloadKey) decide when to load again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const refresh = useCallback(() => {
    silentNext.current = true;
    setReloadKey((key) => key + 1);
  }, []);
  return { ...state, reload, refresh };
}
