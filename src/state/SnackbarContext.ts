import { createContext } from 'react';

export type SnackSeverity = 'info' | 'success' | 'error' | 'warning';

export interface SnackOptions {
  severity?: SnackSeverity;
  duration?: number;
}

export type ShowSnack = (text: string, opts?: SnackOptions) => void;

export const SnackbarContext = createContext<ShowSnack | null>(null);
