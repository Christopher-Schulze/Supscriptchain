'use client';
import { createContext, useContext, useState } from 'react';

interface State {
  message: string | null;
  setMessage: (m: string | null) => void;
}

const Ctx = createContext<State | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  return <Ctx.Provider value={{ message, setMessage }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
}
