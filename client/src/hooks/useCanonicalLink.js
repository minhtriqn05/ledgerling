import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// The whole app is one index.html, whose canonical link names the root of the site: search engines would take
// /welcome, /about or /privacy for copies of "/". The link follows the open page instead. The address of the site
// comes from the link itself (written at build time by vite.config.js), so it is the same on every deploy.
export function useCanonicalLink() {
  const { pathname } = useLocation();

  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]');
    if (!link) return;
    link.href = `${new URL(link.href).origin}${pathname}`;
  }, [pathname]);
}
