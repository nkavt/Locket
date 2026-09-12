import { createContext } from 'react';
import type { AppStateApi } from './useAppStateStore';

export const AppStateContext = createContext<AppStateApi | null>(null);
