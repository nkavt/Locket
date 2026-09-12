import { describe, expect, it } from 'vitest';
import { TicketList } from './TicketList';
import { INITIAL_DATA } from '@/data/constants';
import { renderWithProviders, screen, userEvent, within } from '@/test/render';

const project = INITIAL_DATA.projects[0];
const projectTickets = INITIAL_DATA.tickets.filter((t) => t.projectId === project.id);

describe('TicketList', () => {
  it('renders every ticket of the project grouped by status', () => {
    renderWithProviders(<TicketList project={project} />);
    for (const t of projectTickets) {
      expect(screen.getByText(t.title)).toBeInTheDocument();
    }
    expect(
      screen.getByText(`${projectTickets.length} tickets`, { exact: false }),
    ).toBeInTheDocument();
  });

  it('filters rows by search and shows an empty state when nothing matches', async () => {
    renderWithProviders(<TicketList project={project} />);
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
    await userEvent.click(screen.getByText(projectTickets[0].title));
    expect(router.state.location.pathname).toBe(
      `/projects/${project.id}/tickets/${projectTickets[0].id}`,
    );
  });

  it('opens the new ticket dialog', async () => {
    renderWithProviders(<TicketList project={project} />);
    await userEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Create ticket' })).toBeDisabled();
  });
});
