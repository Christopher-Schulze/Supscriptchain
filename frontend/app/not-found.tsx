'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container">
      <h1>{t('not_found.title')}</h1>
      <p>{t('not_found.description')}</p>
      <Link href="/">{t('not_found.link_home')}</Link>
    </div>
  );
}
