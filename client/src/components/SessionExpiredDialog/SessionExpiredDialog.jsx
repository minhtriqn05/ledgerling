import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../Button/Button.jsx';
import Modal from '../Modal/Modal.jsx';
import styles from './SessionExpiredDialog.module.css';

// The token stopped working while the app was open (it expired, or another device ended the session).
// The page stays behind the dialog. Every way out leads to the login page: endExpiredSession() removes the user,
// ProtectedRoute remembers this page in state.from, and AuthLayout comes back to it after the login.
export default function SessionExpiredDialog() {
  const { t } = useTranslation();
  const { endExpiredSession } = useAuth();

  return (
    <Modal title={t('session.title')} onClose={endExpiredSession}>
      <p className={styles.text}>{t('session.text')}</p>
      <div className={styles.actions}>
        <Button onClick={endExpiredSession} data-autofocus>
          {t('session.logInAgain')}
        </Button>
      </div>
    </Modal>
  );
}
