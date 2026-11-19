import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useCanonicalLink } from './useCanonicalLink.js';

function Page() {
  useCanonicalLink();
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/privacy')}>
      Privacy
    </button>
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Page />} />
      </Routes>
    </MemoryRouter>
  );
}

function addCanonical(href) {
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.append(link);
  return link;
}

afterEach(() => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
});

describe('useCanonicalLink', () => {
  it('names the open page instead of the root of the site', () => {
    const link = addCanonical('https://ledgerling.example/');
    renderAt('/welcome');
    expect(link.href).toBe('https://ledgerling.example/welcome');
  });

  it('keeps the root for "/"', () => {
    const link = addCanonical('https://ledgerling.example/');
    renderAt('/');
    expect(link.href).toBe('https://ledgerling.example/');
  });

  it('follows the page when the address changes', () => {
    const link = addCanonical('https://ledgerling.example/');
    const { getByRole } = renderAt('/about');
    expect(link.href).toBe('https://ledgerling.example/about');
    fireEvent.click(getByRole('button', { name: 'Privacy' }));
    expect(link.href).toBe('https://ledgerling.example/privacy');
  });

  it('does nothing when the page has no canonical link', () => {
    expect(() => renderAt('/terms')).not.toThrow();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
