import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// About, Privacy and Terms: the links in the footer of the public pages
export const LEGAL_PAGES = ['about', 'privacy', 'terms'];

export default function LegalLinks({ className = '', linkClassName = '' }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('legal.linksLabel')} className={className}>
      {LEGAL_PAGES.map((page) => (
        <Link key={page} to={`/${page}`} className={linkClassName}>
          {t(`legal.${page}.title`)}
        </Link>
      ))}
    </nav>
  );
}
