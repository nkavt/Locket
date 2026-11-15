import { beforeEach, describe, expect, it } from 'vitest';
import { TicketList } from './TicketList';
import { DEFAULT_WORKFLOW } from '@/data/workflows';
import { makeProject, makeTicket, makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
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

describe('TicketList with a custom workflow', () => {
  const status = (id: string, name: string, icon: string, color: string, category: string) =>
    ({ id, name, icon, color, category }) as (typeof DEFAULT_WORKFLOW.statuses)[number];
  const review = {
    id: 'wf-review',
    name: 'Review',
    statuses: [
      status('inbox', 'Inbox', 'inbox', 'text.disabled', 'todo'),
      status('review', 'In review', 'rate_review', 'warning.main', 'active'),
      status('shipped', 'Shipped', 'check_circle', 'success.main', 'done'),
      status('dropped', 'Dropped', 'cancel', 'error.main', 'cancelled'),
    ],
  };
  const flow = makeProject({ id: 'flow', slug: 'flow', workflowId: review.id });
  const ticket = (id: string, s: string) =>
    makeTicket({ id, projectId: flow.id, title: `Ticket ${id}`, status: s });

  beforeEach(() =>
    seedLocalWorkspace({
      workflows: [DEFAULT_WORKFLOW, review],
      projects: [flow],
      tickets: [
        ticket('flow-1', 'dropped'),
        ticket('flow-2', 'shipped'),
        ticket('flow-3', 'review'),
        ticket('flow-4', 'inbox'),
      ],
      counters: { flow: 4 },
    }),
  );

  it("groups by the workflow's statuses in its order, Dropped after Shipped", async () => {
    renderWithProviders(<TicketList project={flow} />);
    await screen.findByText('Ticket flow-1');
    const headings = screen
      .getAllByText(/^(Inbox|In review|Shipped|Dropped)$/)
      .map((el) => el.textContent);
    expect(headings).toEqual(['Inbox', 'In review', 'Shipped', 'Dropped']);
  });

  it('leaves cancelled tickets out of the progress count', async () => {
    renderWithProviders(<TicketList project={flow} />);
    expect(await screen.findByText(/3 tickets · 1 done · 1 cancelled/)).toBeInTheDocument();
  });

  it("offers the workflow's statuses in the status filter", async () => {
    renderWithProviders(<TicketList project={flow} />);
    await screen.findByText('Ticket flow-1');
    // The first select is the status filter.
    await userEvent.click(screen.getAllByRole('combobox')[0]);
    const names = ['All statuses', 'Inbox', 'In review', 'Shipped', 'Dropped'];
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(names.length);
    names.forEach((name, i) => expect(options[i]).toHaveAccessibleName(name));
    await userEvent.click(screen.getByRole('option', { name: 'In review' }));
    expect(screen.getByText('Ticket flow-3')).toBeInTheDocument();
    expect(screen.queryByText('Ticket flow-4')).not.toBeInTheDocument();
  });
});
