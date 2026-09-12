import type { ReactNode } from 'react';
import { AppStateContext } from './AppStateContext';
import { useAppStateStore } from './useAppStateStore';

export function AppStateProvider({ children }: { children: ReactNode }) {
  const api = useAppStateStore();
  return <AppStateContext.Provider value={api}>{children}</AppStateContext.Provider>;
}
