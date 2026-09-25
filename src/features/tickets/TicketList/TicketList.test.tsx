import { beforeEach, describe, expect, it } from 'vitest';
import { TicketList } from './TicketList';
import { makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent, within } from '@/test/render';

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
});
