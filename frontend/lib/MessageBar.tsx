'use client';
import { useStore } from './store';

export default function MessageBar() {
  const { message, setMessage } = useStore();
  if (!message) return null;
  return (
    <div className="message-bar" onClick={() => setMessage(null)}>
      {message}
    </div>
  );
}
