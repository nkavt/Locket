import { createHashRouter, Navigate, type RouteObject } from 'react-router';
import { RootLayout } from './app/RootLayout';
import { RootRedirect } from './app/RootRedirect';
import { ProjectRoute } from './routes/ProjectRoute';
import { TicketRoute } from './routes/TicketRoute';
import { SettingsRoute } from './routes/SettingsRoute';

// Path helpers: the only place that knows the URL shape.
export const projectPath = (projectId: string) => `/projects/${projectId}`;
export const ticketPath = (projectId: string, ticketId: string) =>
  `/projects/${projectId}/tickets/${ticketId}`;
export const settingsPath = () => '/settings';

// Hash history: works with file:// URLs in the packaged Electron app.
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: RootRedirect },
      { path: 'projects/:projectId', Component: ProjectRoute },
      { path: 'projects/:projectId/tickets/:ticketId', Component: TicketRoute },
      { path: 'settings', Component: SettingsRoute },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createHashRouter(routes);
