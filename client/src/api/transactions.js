import api from './axios.js';

// Calls to the /transactions endpoints (docs/api-plan.md, endpoints 10–14).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// filters (all optional, see docs/api-plan.md endpoint 10):
//   month: 'YYYY-MM' (the server uses the current month by default; cannot be combined with from / to)
//   from, to: 'YYYY-MM-DD' (both days included)
//   type: 'income' | 'expense', categoryId, q (search in the note), tag (one tag)
//   sort: 'date' | '-date' (default) | 'amount' | '-amount'
//   page (default 1), limit (default 20, at most 100)
// Returns one page: { items, meta }.
//   items: the transactions, each with its `category` ({ _id, name, color })
//   meta: { page, limit, total, totalPages }, where total counts the matches on all pages
export async function getTransactions(filters = {}) {
  const response = await api.get('/transactions', { params: filters });
  return { items: response.data.data, meta: response.data.meta };
}

// Downloads the CSV for the same filters as getTransactions (page and limit are not needed: the server ignores them).
// Returns { blob, filename }; save it with downloadFile() from ../utils/downloadFile.js.
// responseType 'blob' makes axios give the raw file. It also makes an error body a Blob, so it is turned back
// into the usual { success: false, message } object here, and getErrorMessage() keeps working.
export async function exportTransactions(filters = {}) {
  try {
    const response = await api.get('/transactions/export', { params: filters, responseType: 'blob' });
    // The server names the file (e.g. ledgerling-2026-10.csv) in the Content-Disposition header
    const match = /filename="([^"]+)"/.exec(response.headers['content-disposition'] ?? '');
    return { blob: response.data, filename: match ? match[1] : 'ledgerling.csv' };
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Not JSON: leave it, getErrorMessage() shows its generic message
      }
    }
    throw error;
  }
}

// transaction: { categoryId, amount, note, tags, date }. The type comes from the category; the currency defaults to VND.
export async function createTransaction(transaction) {
  const response = await api.post('/transactions', transaction);
  return response.data.data;
}

// changes: any of { categoryId, amount, note, tags, date }
export async function updateTransaction(id, changes) {
  const response = await api.patch(`/transactions/${id}`, changes);
  return response.data.data;
}

// Returns { _id } of the deleted transaction.
export async function deleteTransaction(id) {
  const response = await api.delete(`/transactions/${id}`);
  return response.data.data;
}

// Sends the rows read from a CSV file (docs/api-plan.md, endpoint 22): 1 to 500 rows, see utils/csvImport.js.
// Returns { imported, failed, errors } where errors is [{ row, message }] (row 1 = the first row sent).
// Good rows are saved even when other rows fail, so a result with errors is not a thrown error.
export async function importTransactions(rows) {
  const response = await api.post('/transactions/import', { rows });
  return response.data.data;
}
