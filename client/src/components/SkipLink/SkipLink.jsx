import { useTranslation } from 'react-i18next';
import styles from './SkipLink.module.css';

// The first thing the Tab key reaches: it jumps over the menu to the content of the page.
// Hidden until it has the focus. It moves the focus itself, so the address gets no #hash for React Router to read.
export default function SkipLink() {
  const { t } = useTranslation();

  function handleClick(event) {
    event.preventDefault();
    const main = document.querySelector('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus();
  }

  return (
    <a href="#main" className={styles.skip} onClick={handleClick}>
      {t('common.skipToContent')}
    </a>
  );
}
