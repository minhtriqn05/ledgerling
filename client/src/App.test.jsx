import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

// The pages are lazy (code splitting): they appear after their file is loaded, so every query here is a findBy*.
function renderApp(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear(); // no stored session: signed out
});

describe('App routes (lazy pages)', () => {
  it('shows the Not found page for an unknown address once its code is loaded', async () => {
    renderApp('/no-such-page');
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('shows the Login form inside the auth layout', async () => {
    renderApp('/login');
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
  });

  it('sends a signed-out visitor from a protected page to Login, loading only that page', async () => {
    renderApp('/transactions');
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
  });
});
