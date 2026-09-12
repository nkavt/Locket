import { useContext } from 'react';
import { ThemeModeContext, type ThemeModeApi } from './ThemeModeContext';

export function useThemeMode(): ThemeModeApi {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}
