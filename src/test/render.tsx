import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL for the memory router. Defaults to "/". */
  route?: string;
}

function Providers({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}

/** Render with theme, snackbar and app-state providers, inside a memory router. */
export function renderWithProviders(ui: ReactElement, { route = '/', ...options }: Options = {}) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [route] });
  return {
    router,
    ...render(<RouterProvider router={router} />, { wrapper: Providers, ...options }),
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
