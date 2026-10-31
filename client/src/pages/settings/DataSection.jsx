import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportMyData } from '../../api/users.js';
import { getErrorMessage } from '../../api/axios.js';
import { useToast } from '../../context/ToastContext.jsx';
import { downloadFile } from '../../utils/downloadFile.js';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import styles from './Settings.module.css';

// "Download my data": everything the account owns, as one .json file. The password hash is never in it.
export default function DataSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const data = await exportMyData();
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(file, `ledgerling-data-${data.exportedAt.slice(0, 10)}.json`);
      toast.success(t('settings.data.done'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader icon="download" tone="sky" title={t('settings.data.title')} subtitle={t('settings.data.text')} />
      <div className={styles.actions}>
        <Button needsNetwork variant="secondary" icon="download" onClick={handleClick} disabled={busy}>
          {busy ? t('settings.data.working') : t('settings.data.download')}
        </Button>
      </div>
    </Card>
  );
}
