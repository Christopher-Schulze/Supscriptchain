'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="container">
      <h1>{t('home.title')}</h1>
      <ul className="nav">
        <li>
          <Link href="/plans">{t('nav.plans')}</Link>
        </li>
        <li>
          <Link href="/plans/create">{t('nav.create_plan')}</Link>
        </li>
        <li>
          <Link href="/plans/manage">{t('nav.manage_plans')}</Link>
        </li>
        <li>
          <Link href="/manage">{t('nav.manage')}</Link>
        </li>
        <li>
          <Link href="/payment">{t('nav.payment')}</Link>
        </li>
        <li>
          <Link href="/analytics">{t('nav.analytics')}</Link>
        </li>
      </ul>
    </div>
  );
}
