// The full address of the site, for the tags in index.html that need one (canonical link, Open Graph, Twitter card).
// vite.config.js calls it at build time with the environment:
// 1. VITE_SITE_URL, when it is set (e.g. a custom domain);
// 2. otherwise VERCEL_PROJECT_PRODUCTION_URL, the production address that Vercel gives every build (without https://);
// 3. otherwise the address of the live app.
const LIVE_ADDRESS = 'https://ledgerling-ten.vercel.app';

export function siteAddress(env) {
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL;
  const address = env.VITE_SITE_URL || (vercelHost ? `https://${vercelHost}` : LIVE_ADDRESS);
  return address.replace(/\/+$/, '');
}
