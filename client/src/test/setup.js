// Runs before every unit test file.
// jest-dom adds matchers like toBeInTheDocument(); cleanup() removes what the last test rendered.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
