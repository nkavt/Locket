import { createContext } from 'react';
import type { ThemeMode } from '@/theme';

export interface ThemeModeApi {
  mode: ThemeMode;
  toggle: () => void;
}

export const ThemeModeContext = createContext<ThemeModeApi | null>(null);
