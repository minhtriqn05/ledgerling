// The deployed site that `npm run test:e2e:live` checks (the live-smoke workflow runs it after every deploy of main).
// LIVE_APP_URL and LIVE_API_URL point the tests at another deployment, for example the local end-to-end servers.
export const LIVE_APP_URL = (process.env.LIVE_APP_URL || 'https://ledgerling-ten.vercel.app').replace(/\/+$/, '');
export const LIVE_API_URL = (process.env.LIVE_API_URL || 'https://ledgerling-api.onrender.com/api').replace(/\/+$/, '');
