'use client';
import { createContext, useContext, useState } from 'react';

export interface Message {
  text: string;
  type?: 'success' | 'warning' | 'error';
}

interface State {
  message: Message | null;
  setMessage: (m: Message | null) => void;
}

const Ctx = createContext<State | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  return <Ctx.Provider value={{ message, setMessage }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
}
