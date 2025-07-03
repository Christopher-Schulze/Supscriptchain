'use client';
import { useStore } from './store';

export default function MessageBar() {
  const { message, setMessage } = useStore();
  if (!message) return null;
  return (
    <div style={{background:'#e0ffe0', padding:8, marginBottom:8}} onClick={()=>setMessage(null)}>
      {message}
    </div>
  );
}
