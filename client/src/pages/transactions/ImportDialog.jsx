import { useMemo, useState } from 'react';
import { importTransactions } from '../../api/transactions.js';
import { getErrorMessage } from '../../api/axios.js';
import { formatNumber } from '../../utils/format.js';
import { MAX_IMPORT_ROWS, parseCsvText, validateImportRow } from '../../utils/csvImport.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import styles from './ImportDialog.module.css';

// A CSV file is a few dozen kB for 500 rows; anything much bigger is not a Ledgerling export.
const MAX_FILE_BYTES = 1024 * 1024;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// "Import CSV" dialog in three steps: choose a file -> preview (rows with a problem are marked) -> result.
// The file is read in the browser (papaparse); only its rows are sent to the API.
// categories: the user's categories (a row can only use one that exists).
// onImported(result) is called once the API answered, so the page can reload its list while the result is shown.
export default function ImportDialog({ categories, onImported, onClose }) {
  const [rows, setRows] = useState(null); // rows read from the file, null until a good file is chosen
  const [fileError, setFileError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { imported, failed, errors } from the API

  // One message per row ('' = fine). Checked again by the server; this only marks the rows in the preview.
  const problems = useMemo(() => (rows ? rows.map((row) => validateImportRow(row, categories)) : []), [rows, categories]);
  const validCount = problems.filter((problem) => !problem).length;
  const badCount = problems.length - validCount;

  async function handleFile(event) {
    const file = event.target.files[0];
    setRows(null);
    setFileError('');
    setImportError('');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('This file is too big. Choose a CSV file exported from Ledgerling.');
      return;
    }

    try {
      const parsed = parseCsvText(await file.text());
      if (parsed.error) setFileError(parsed.error);
      else setRows(parsed.rows);
    } catch {
      setFileError('The file could not be read.');
    }
  }

  async function handleImport() {
    setImportError('');
    setImporting(true);
    try {
      // Every row is sent (also the marked ones), so the row numbers of the answer match the preview.
      const answer = await importTransactions(rows);
      setResult(answer);
      onImported(answer);
    } catch (err) {
      setImportError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  if (result) {
    return (
      <Modal title="Import CSV" onClose={onClose}>
        <div className={styles.body}>
          <p className={styles.summary} role="status">
            Imported {plural(result.imported, 'transaction')}.
            {result.failed > 0 && ` ${plural(result.failed, 'row')} could not be imported.`}
          </p>
          {result.errors.length > 0 && (
            <ul className={styles.errorList} aria-label="Rows that were not imported">
              {result.errors.map((error) => (
                <li key={error.row}>
                  <strong>Row {error.row}:</strong> {error.message}
                </li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Import CSV" onClose={onClose} busy={importing} wide>
      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="import-file">
            CSV file
          </label>
          <input
            id="import-file"
            className={styles.file}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            disabled={importing}
            data-autofocus
          />
          <p className={styles.hint}>
            Use a file made by Export CSV: Date, Type, Category, Amount, Currency, Note, Tags. Up to {MAX_IMPORT_ROWS}{' '}
            rows. Every category in the file must already exist.
          </p>
        </div>

        {fileError && <Alert>{fileError}</Alert>}

        {rows && (
          <>
            <p className={styles.summary} role="status">
              {plural(rows.length, 'row')} found.{' '}
              {badCount > 0 ? `${plural(badCount, 'row')} with a problem will be skipped.` : 'All rows look fine.'}
            </p>
            <div className={styles.previewWrap} role="region" aria-label="Preview of the file" tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th className={styles.alignRight}>Amount</th>
                    <th>Note</th>
                    <th>Tags</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className={problems[index] ? styles.badRow : undefined}>
                      <td className={styles.muted}>{index + 1}</td>
                      <td>{row.date}</td>
                      <td>{row.type}</td>
                      <td>{row.category}</td>
                      <td className={styles.alignRight}>
                        {typeof row.amount === 'number' ? formatNumber(row.amount) : row.amount}
                      </td>
                      <td className={styles.noteCell}>{row.note}</td>
                      <td>{row.tags.map((tag) => `#${tag}`).join(' ')}</td>
                      <td className={problems[index] ? styles.problem : styles.ok}>{problems[index] || 'Ready'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {importError && <Alert>{importError}</Alert>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!rows || validCount === 0 || importing}>
            {importing ? 'Importing…' : `Import ${plural(validCount, 'row')}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
