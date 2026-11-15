import { describe, expect, it } from 'vitest';
import { WorkflowsCard } from './WorkflowsCard';
import { makeWorkspace } from '@/test/fixtures';
import { installMockLocket } from '@/test/mockLocket';
import { renderWithProviders, screen, userEvent, waitFor, within } from '@/test/render';

const open = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name }));
  return screen.findByRole('dialog');
};

describe('WorkflowsCard', () => {
  it('lists workflows with their statuses and the projects using them', async () => {
    installMockLocket({ data: makeWorkspace() });
    renderWithProviders(<WorkflowsCard />);
    expect(await screen.findByText('Used by Alpha, Beta')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    // The default workflow can't be deleted.
    expect(screen.getByRole('button', { name: 'Delete workflow: Default' })).toBeDisabled();
  });

  it('adds a Cancelled status to a shared workflow', async () => {
    const mock = installMockLocket({ data: makeWorkspace() });
    renderWithProviders(<WorkflowsCard />);
    const dialog = await open('Edit workflow: Default');
    expect(
      within(dialog).getByText('Changes apply to all 2 projects using it.'),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add status' }));
    const names = within(dialog).getAllByRole('textbox', { name: 'Status name' });
    expect(names[3]).toHaveFocus();
    await userEvent.type(names[3], 'Cancelled');
    const categories = within(dialog).getAllByRole('combobox', { name: 'Category' });
    await userEvent.click(categories[3]);
    await userEvent.click(await screen.findByRole('option', { name: 'Cancelled' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mock.data!.workflows[0].statuses.map((s) => [s.name, s.category])).toEqual([
        ['To Do', 'todo'],
        ['In Progress', 'active'],
        ['Done', 'done'],
        ['Cancelled', 'cancelled'],
      ]),
    );
    // Existing statuses keep the ids tickets store.
    expect(mock.data!.workflows[0].statuses.slice(0, 3).map((s) => s.id)).toEqual([
      'todo',
      'in_progress',
      'done',
    ]);
  });

  it('asks where tickets go before deleting a status that has them', async () => {
    const mock = installMockLocket({ data: makeWorkspace() });
    renderWithProviders(<WorkflowsCard />);
    const dialog = await open('Edit workflow: Default');
    // "Done" holds alp-2.
    expect(within(dialog).getByText('1 ticket')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Done' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Move tickets first')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Done' }));
    await userEvent.click(await screen.findByRole('option', { name: 'In Progress' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move and save' }));

    await waitFor(() =>
      expect(mock.data!.tickets.find((t) => t.id === 'alp-2')?.status).toBe('in_progress'),
    );
    expect(mock.data!.workflows[0].statuses.map((s) => s.id)).toEqual(['todo', 'in_progress']);
  });

  it('duplicates a workflow, and deletes an unused one', async () => {
    const mock = installMockLocket({ data: makeWorkspace() });
    renderWithProviders(<WorkflowsCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Duplicate: Default' }));
    expect(await screen.findByText('Default copy')).toBeInTheDocument();
    expect(mock.data!.workflows[1].statuses.map((s) => s.name)).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
    expect(screen.getByText('Not used by any project')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete workflow: Default copy' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => expect(screen.queryByText('Default copy')).not.toBeInTheDocument());
    expect(mock.data!.workflows.map((w) => w.id)).toEqual(['default']);
  });

  it("won't save blank or duplicate status names", async () => {
    installMockLocket({ data: makeWorkspace() });
    renderWithProviders(<WorkflowsCard />);
    const dialog = await open('New workflow');
    const names = within(dialog).getAllByRole('textbox', { name: 'Status name' });
    await userEvent.clear(names[1]);
    await userEvent.type(names[1], 'to do');
    expect(within(dialog).getByText('Two statuses are called "to do"')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create workflow' })).toBeDisabled();
  });
});
