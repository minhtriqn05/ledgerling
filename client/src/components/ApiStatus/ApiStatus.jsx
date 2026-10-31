import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios.js';
import styles from './ApiStatus.module.css';

// One-line check that the browser can reach the API (CORS and VITE_API_URL are set up correctly).
// Calls GET /health through the shared axios instance and shows the result.

export default function ApiStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    // The controller cancels the request if the component unmounts before the answer arrives.
    const controller = new AbortController();

    api
      .get('/health', { signal: controller.signal, timeout: 5000 })
      .then((response) => setStatus(response.data?.success ? 'connected' : 'unreachable'))
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setStatus('unreachable');
      });

    return () => controller.abort();
  }, []);

  return (
    <p className={`${styles.status} ${styles[status]}`} role="status">
      <span className={styles.dot} aria-hidden="true" />
      {t(`apiStatus.${status}`)}
    </p>
  );
}
