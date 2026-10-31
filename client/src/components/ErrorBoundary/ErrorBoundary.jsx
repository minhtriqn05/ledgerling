import { Component } from 'react';
import i18n from '../../i18n/index.js';
import FullPageMessage from '../FullPageMessage/FullPageMessage.jsx';
import Button from '../Button/Button.jsx';

// Catches an error thrown while any component below it renders, so the user sees a message
// instead of a blank page. React only supports this with a class component.
// It does not catch errors in event handlers or in async code (try/catch + toast handle those).
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  // React calls this when a child throws: switch to the fallback screen.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unexpected error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <FullPageMessage
        icon="alert"
        title={i18n.t('errorPage.title')}
        text={i18n.t('errorPage.text')}
      >
        <Button icon="sprout" onClick={() => window.location.reload()}>
          {i18n.t('errorPage.reload')}
        </Button>
      </FullPageMessage>
    );
  }
}
