import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// The breadcrumb trail comes from the address (config/breadcrumbs.js). A page that opens something on top of itself,
// like the transaction drawer, adds one more level through useBreadcrumbDetail, so the trail can show it.
// Without a provider (a unit test of one component) every hook still works and does nothing.

const BreadcrumbContext = createContext({ detail: null, setDetail: () => {} });

export function BreadcrumbProvider({ children }) {
  const [detail, setDetail] = useState(null);
  const value = useMemo(() => ({ detail, setDetail }), [detail]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

// What the trail shows below the page right now: { labelKey, onBack } or null
export function useCurrentBreadcrumbDetail() {
  return useContext(BreadcrumbContext).detail;
}

// For a page: while `labelKey` is set, the trail ends with that level. onBack closes the open thing; the item for the
// page itself calls it instead of navigating (so the filters in the address stay).
export function useBreadcrumbDetail(labelKey, onBack) {
  const { setDetail } = useContext(BreadcrumbContext);
  // The latest onBack, without making the effect run again on every render
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    if (!labelKey) return undefined;
    setDetail({ labelKey, onBack: () => latest.current?.() });
    return () => setDetail(null);
  }, [labelKey, setDetail]);
}
