'use client';
import { useStore } from './store';

export default function MessageBar() {
  const { message, setMessage } = useStore();
  if (!message) return null;
  const className = `message-bar ${message.type ?? ''}`.trim();
  return (
    <div className={className} onClick={() => setMessage(null)}>
      {message.text}
    </div>
  );
}
