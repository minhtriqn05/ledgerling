import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import BackButton from '../components/BackButton/BackButton.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher.jsx';
import LegalLinks from '../components/LegalLinks/LegalLinks.jsx';
import Logo from '../components/Logo/Logo.jsx';
import styles from './StaticPage.module.css';

// The headings of each page; the text is in the translations: legal.<page>.<section>.title and .text
const SECTIONS = {
  about: ['what', 'who', 'built'],
  privacy: ['collect', 'where', 'control'],
  terms: ['use', 'data', 'warranty'],
};

// About, Privacy and Terms: short pages of text, open to everybody. page: 'about' | 'privacy' | 'terms'.
export default function StaticPage({ page }) {
  const { t } = useTranslation();
  useDocumentTitle(t(`legal.${page}.title`));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/welcome" className={styles.brand}>
          <Logo size={34} />
        </Link>
        <LanguageSwitcher />
      </header>

      <main className={styles.main}>
        <BackButton to="/welcome" />
        <article className={styles.article}>
          <h1 className={styles.title}>{t(`legal.${page}.title`)}</h1>
          <p className={styles.lead}>{t(`legal.${page}.lead`)}</p>
          {SECTIONS[page].map((section) => (
            <section key={section}>
              <h2 className={styles.heading}>{t(`legal.${page}.${section}.title`)}</h2>
              <p className={styles.text}>{t(`legal.${page}.${section}.text`)}</p>
            </section>
          ))}
        </article>
      </main>

      <footer className={styles.footer}>
        <p>{t('welcome.footerNote')}</p>
        <LegalLinks className={styles.links} linkClassName={styles.link} />
      </footer>
    </div>
  );
}
