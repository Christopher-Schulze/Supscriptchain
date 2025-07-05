'use client';
import { useStore } from './store';

export default function MessageBar() {
  const { message, setMessage } = useStore();
  if (!message) return null;
  const className = `message-bar ${message.type ?? ''}`.trim();
  return (
    <div
      className={className}
      role="button"
      aria-live="assertive"
      tabIndex={0}
      aria-label="Dismiss message"
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
