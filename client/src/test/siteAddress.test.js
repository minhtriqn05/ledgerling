import { describe, expect, it } from 'vitest';
import { siteAddress } from '../../scripts/siteAddress.js';

// The full address of the site, written into the canonical link and the Open Graph / Twitter tags at build time.

describe('siteAddress', () => {
  it('uses VITE_SITE_URL when it is set, without a trailing slash', () => {
    expect(siteAddress({ VITE_SITE_URL: 'https://ledgerling.example.com/' })).toBe('https://ledgerling.example.com');
  });

  it('uses the production address Vercel gives the build when VITE_SITE_URL is not set', () => {
    expect(siteAddress({ VERCEL_PROJECT_PRODUCTION_URL: 'ledgerling-ten.vercel.app' })).toBe('https://ledgerling-ten.vercel.app');
  });

  it('falls back to the address of the live app, never to a site of someone else', () => {
    expect(siteAddress({})).toBe('https://ledgerling-ten.vercel.app');
  });
});
