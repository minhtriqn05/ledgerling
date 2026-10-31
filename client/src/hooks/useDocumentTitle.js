import { useEffect } from 'react';

// The text of the browser tab: "Budgets · Ledgerling". PageHeader calls it for every signed-in page.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Ledgerling` : 'Ledgerling';
  }, [title]);
}
