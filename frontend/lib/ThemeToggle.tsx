'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove(
      theme === 'light' ? 'dark' : 'light',
    );
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <button onClick={toggle} className="theme-toggle">
      {theme === 'light' ? t('theme.dark') : t('theme.light')}
    </button>
  );
}
