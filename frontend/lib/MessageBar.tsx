'use client';
import { useStore } from './store';
import { useTranslation } from 'react-i18next';

export default function MessageBar() {
  const { message, setMessage } = useStore();
  const { t } = useTranslation();
  if (!message) return null;
  const className = `message-bar ${message.type ?? ''}`.trim();
  return (
    <div
      className={className}
      role="button"
      aria-live="assertive"
      tabIndex={0}
      aria-label={t('messages.dismiss')}
      onClick={() => setMessage(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setMessage(null);
        }
      }}
    >
      {message.text}
    </div>
  );
}
