import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon.jsx';
import styles from './BackButton.module.css';

// "‹ Back": one level up from a page below another one. With `to` it is a link; with `onClick` a button
// (something on top of the page closes, like the transaction drawer).
export default function BackButton({ to, onClick, className = '' }) {
  const { t } = useTranslation();
  const classes = `${styles.back} ${className}`;
  const content = (
    <>
      <Icon name="chevronLeft" size={16} />
      {t('common.back')}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}
