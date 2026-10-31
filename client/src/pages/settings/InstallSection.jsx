import { useTranslation } from 'react-i18next';
import { promptInstall, useInstallState } from '../../utils/installPrompt.js';
import Button from '../../components/Button/Button.jsx';
import Card, { CardHeader } from '../../components/Card/Card.jsx';
import styles from './Settings.module.css';

// "Install app": the install button where the browser offers one, otherwise how to do it by hand.
export default function InstallSection() {
  const { t } = useTranslation();
  const state = useInstallState();

  return (
    <Card>
      <CardHeader icon="download" tone="sky" title={t('settings.install.title')} subtitle={t('settings.install.text')} />
      {state === 'ready' && (
        <div className={styles.actions}>
          <Button icon="download" onClick={promptInstall}>
            {t('settings.install.button')}
          </Button>
        </div>
      )}
      {state === 'manual' && <p className={styles.text}>{t('settings.install.manual')}</p>}
      {state === 'installed' && <p className={styles.text}>{t('settings.install.installed')}</p>}
    </Card>
  );
}
