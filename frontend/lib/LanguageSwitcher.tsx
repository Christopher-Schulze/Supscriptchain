'use client';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const toggle = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'de' : 'en');
  };
  return (
    <button onClick={toggle} style={{ float: 'right' }}>
      {i18n.language === 'en' ? 'DE' : 'EN'}
    </button>
  );
}
