import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import FullPageMessage from '../components/FullPageMessage/FullPageMessage.jsx';
import Button from '../components/Button/Button.jsx';

// Shown for every address that no route matches (see the path="*" route in App.jsx).
export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(t('notFound.title'));

  return (
    <FullPageMessage
      code="404"
      icon="alert"
      title={t('notFound.title')}
      text={t('notFound.text')}
    >
      <Button icon="dashboard" onClick={() => navigate('/')}>
        {t('notFound.goToDashboard')}
      </Button>
    </FullPageMessage>
  );
}
