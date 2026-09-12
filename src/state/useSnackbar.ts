import { useContext } from 'react';
import { SnackbarContext, type ShowSnack } from './SnackbarContext';

export function useSnackbar(): ShowSnack {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}
