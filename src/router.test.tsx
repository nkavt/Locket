import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';
import { INITIAL_DATA } from '@/data/constants';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const first = INITIAL_DATA.projects[0];
const firstTicket = INITIAL_DATA.tickets.find((t) => t.projectId === first.id)!;
const otherProject = INITIAL_DATA.projects.find((p) => p.id !== first.id)!;

describe('routes', () => {
  it('"/" redirects to the first project', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${first.id}`));
    expect(await screen.findByRole('heading', { name: first.name })).toBeInTheDocument();
  });

  it('renders a ticket at its route', async () => {
    renderAt(`/projects/${first.id}/tickets/${firstTicket.id}`);
    expect(await screen.findByRole('heading', { name: firstTicket.title })).toBeInTheDocument();
  });

  it('unknown project redirects home', async () => {
    const router = renderAt('/projects/does-not-exist');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${first.id}`));
  });

  it('ticket under the wrong project redirects to that project', async () => {
    const router = renderAt(`/projects/${otherProject.id}/tickets/${firstTicket.id}`);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/projects/${otherProject.id}`),
    );
  });

  it('unknown ticket redirects to its project', async () => {
    const router = renderAt(`/projects/${first.id}/tickets/nope-99`);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${first.id}`));
  });

  it('renders settings', async () => {
    renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('unmatched paths go home', async () => {
    const router = renderAt('/whatever/else');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${first.id}`));
  });
});
