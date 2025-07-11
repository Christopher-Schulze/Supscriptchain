import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '../styles/theme.css';
import { StoreProvider } from '../lib/store';
import MessageBar from '../lib/MessageBar';
import NetworkStatus from '../lib/NetworkStatus';
import ThemeToggle from '../lib/ThemeToggle';
import { PlansProvider } from '../lib/plansStore';
import I18nProvider from '../lib/I18nProvider';
import LanguageSwitcher from '../lib/LanguageSwitcher';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <I18nProvider>
          <StoreProvider>
            <PlansProvider>
              <div className="top-bar">
                <LanguageSwitcher />
                <ThemeToggle />
                <NetworkStatus />
              </div>
              <MessageBar />
              {children}
            </PlansProvider>
          </StoreProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
