import { useNavigate } from 'react-router-dom';
import FullPageMessage from '../components/FullPageMessage/FullPageMessage.jsx';
import Button from '../components/Button/Button.jsx';

// Shown for every address that no route matches (see the path="*" route in App.jsx).
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <FullPageMessage
      code="404"
      icon="alert"
      title="Page not found"
      text="The page you are looking for does not exist or has been moved."
    >
      <Button icon="dashboard" onClick={() => navigate('/')}>
        Go to Dashboard
      </Button>
    </FullPageMessage>
  );
}
