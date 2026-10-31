import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importTransactions } from '../../api/transactions.js';
import { getErrorMessage, translateApiError } from '../../api/axios.js';
import { formatNumber } from '../../utils/format.js';
import { MAX_IMPORT_ROWS, parseCsvText, validateImportRow } from '../../utils/csvImport.js';
import Modal from '../../components/Modal/Modal.jsx';
import Button from '../../components/Button/Button.jsx';
import Alert from '../../components/Alert/Alert.jsx';
import styles from './ImportDialog.module.css';

// A CSV file is a few dozen kB for 500 rows; anything much bigger is not a Ledgerling export.
const MAX_FILE_BYTES = 1024 * 1024;

// "Import CSV" dialog in three steps: choose a file -> preview (rows with a problem are marked) -> result.
// The file is read in the browser (papaparse); only its rows are sent to the API.
// categories: the user's categories (a row can only use one that exists).
// onImported(result) is called once the API answered, so the page can reload its list while the result is shown.
export default function ImportDialog({ categories, onImported, onClose }) {
  const { t } = useTranslation();
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
      setFileError(t('import.tooBig'));
      return;
    }

    try {
      const parsed = parseCsvText(await file.text());
      if (parsed.error) setFileError(parsed.error);
      else setRows(parsed.rows);
    } catch {
      setFileError(t('import.unreadable'));
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
      <Modal title={t('import.title')} onClose={onClose}>
        <div className={styles.body}>
          <p className={styles.summary} role="status">
            {t('import.imported', { count: result.imported })}
            {result.failed > 0 && ` ${t('import.failed', { count: result.failed })}`}
          </p>
          {result.errors.length > 0 && (
            <ul className={styles.errorList} aria-label={t('import.failedRows')}>
              {result.errors.map((error) => (
                <li key={error.row}>
                  <strong>{t('import.rowNumber', { row: error.row })}</strong> {translateApiError(error)}
                </li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            <Button onClick={onClose}>{t('common.done')}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('import.title')} onClose={onClose} busy={importing} wide>
      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="import-file">
            {t('import.file')}
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
            {t('import.hint', { max: MAX_IMPORT_ROWS })}
          </p>
        </div>

        {fileError && <Alert>{fileError}</Alert>}

        {rows && (
          <>
            <p className={styles.summary} role="status">
              {t('import.found', { count: rows.length })}{' '}
              {badCount > 0 ? t('import.skipped', { count: badCount }) : t('import.allFine')}
            </p>
            <div className={styles.previewWrap} role="region" aria-label={t('import.preview')} tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('import.row')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('common.type')}</th>
                    <th>{t('common.category')}</th>
                    <th className={styles.alignRight}>{t('common.amount')}</th>
                    <th>{t('common.note')}</th>
                    <th>{t('common.tags')}</th>
                    <th>{t('import.status')}</th>
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
                      <td className={problems[index] ? styles.problem : styles.ok}>{problems[index] || t('import.ready')}</td>
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!rows || validCount === 0 || importing}>
            {importing ? t('import.importing') : t('import.action', { count: validCount })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
