import type { ReactNode } from 'react';
import { AppStateProvider } from '@/state/AppStateProvider';
import { SnackbarProvider } from '@/state/SnackbarProvider';
import { ThemeModeProvider } from '@/state/ThemeModeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <SnackbarProvider>
        <AppStateProvider>{children}</AppStateProvider>
      </SnackbarProvider>
    </ThemeModeProvider>
  );
}
