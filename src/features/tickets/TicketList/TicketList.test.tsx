import { beforeEach, describe, expect, it } from 'vitest';
import { TicketList } from './TicketList';
import { makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent, waitFor, within } from '@/test/render';

const data = makeWorkspace();
const project = data.projects[0];
const projectTickets = data.tickets.filter((t) => t.projectId === project.id);

describe('TicketList', () => {
  beforeEach(() => seedLocalWorkspace(data));

  it('renders every ticket of the project grouped by status', async () => {
    renderWithProviders(<TicketList project={project} />);
    for (const t of projectTickets) {
      expect(await screen.findByText(t.title)).toBeInTheDocument();
    }
    expect(
      screen.getByText(`${projectTickets.length} tickets`, { exact: false }),
    ).toBeInTheDocument();
  });

  it('filters rows by search and shows an empty state when nothing matches', async () => {
    renderWithProviders(<TicketList project={project} />);
    await screen.findByText(projectTickets[1].title);
    const search = screen.getByPlaceholderText(/Search tickets/);
    await userEvent.type(search, projectTickets[0].title);
    expect(screen.getByText(projectTickets[0].title)).toBeInTheDocument();
    expect(screen.queryByText(projectTickets[1].title)).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'zzz-no-match');
    expect(screen.getByText('No tickets match your filters')).toBeInTheDocument();
  });

  it('navigates to the ticket route on row click', async () => {
    const { router } = renderWithProviders(<TicketList project={project} />);
    await userEvent.click(await screen.findByText(projectTickets[0].title));
    expect(router.state.location.pathname).toBe(
      `/projects/${project.id}/tickets/${projectTickets[0].id}`,
    );
  });

  it('opens the new ticket dialog', async () => {
    renderWithProviders(<TicketList project={project} />);
    await screen.findByText(projectTickets[0].title);
    await userEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Create ticket' })).toBeDisabled();
  });
  it('shows an archived project read-mostly: a banner, no new tickets, Unarchive restores it', async () => {
    const archived = { ...project, archivedAt: '2026-01-01T00:00:00.000Z' };
    seedLocalWorkspace({ ...data, projects: [archived, data.projects[1]] });
    renderWithProviders(<TicketList project={archived} />);
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('This project is archived.');
    expect(screen.getByRole('button', { name: 'New ticket' })).toBeDisabled();
    // Existing tickets are still listed and open as usual.
    expect(screen.getByText(projectTickets[0].title)).toBeInTheDocument();

    await userEvent.click(within(banner).getByRole('button', { name: 'Unarchive' }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('locket-app-state-v1')!);
      expect(saved.projects[0].archivedAt).toBeNull();
    });
  });

  it('shows no banner for an active project', async () => {
    renderWithProviders(<TicketList project={project} />);
    await screen.findByText(projectTickets[0].title);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New ticket' })).toBeEnabled();
  });
});
