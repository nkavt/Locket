import { describe, expect, it, vi } from 'vitest';
import { EditProjectDialog } from './EditProjectDialog';
import { makeWorkspace } from '@/test/fixtures';
import { installMockLocket } from '@/test/mockLocket';
import { renderWithProviders, screen, userEvent, waitFor, within } from '@/test/render';

const workspace = () => {
  const data = makeWorkspace();
  data.workflows.push({
    id: 'wf-review',
    name: 'Review',
    statuses: [
      { id: 'inbox', name: 'Inbox', icon: 'inbox', color: 'text.disabled', category: 'todo' },
      {
        id: 'review',
        name: 'In review',
        icon: 'rate_review',
        color: 'info.main',
        category: 'active',
      },
      {
        id: 'shipped',
        name: 'Shipped',
        icon: 'check_circle',
        color: 'success.main',
        category: 'done',
      },
    ],
  });
  return data;
};

describe('EditProjectDialog workflow switch', () => {
  it('reviews where tickets go, then moves them with the project', async () => {
    const data = workspace();
    const mock = installMockLocket({ data });
    const onClose = vi.fn();
    renderWithProviders(<EditProjectDialog open project={data.projects[0]} onClose={onClose} />);
    const dialog = await screen.findByRole('dialog');

    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Workflow' }));
    await userEvent.click(await screen.findByRole('option', { name: /^Review/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    // alp-1 is To Do and alp-2 Done: the review suggests the matching categories.
    const review = await screen.findByRole('dialog', { name: 'Switch to Review' });
    expect(within(review).getByRole('combobox', { name: 'To Do' })).toHaveTextContent('Inbox');
    expect(within(review).getByRole('combobox', { name: 'Done' })).toHaveTextContent('Shipped');
    await userEvent.click(within(review).getByRole('combobox', { name: 'To Do' }));
    await userEvent.click(await screen.findByRole('option', { name: 'In review' }));
    await userEvent.click(within(review).getByRole('button', { name: 'Switch and save' }));

    await waitFor(() => expect(mock.data!.projects[0].workflowId).toBe('wf-review'));
    const status = (id: string) => mock.data!.tickets.find((t) => t.id === id)?.status;
    expect(status('alp-1')).toBe('review');
    expect(status('alp-2')).toBe('shipped');
    // The other project stays on the default workflow.
    expect(status('bet-1')).toBe('todo');
    expect(onClose).toHaveBeenCalled();
  });

  it('saves straight away when only other fields change', async () => {
    const data = workspace();
    const mock = installMockLocket({ data });
    renderWithProviders(<EditProjectDialog open project={data.projects[0]} onClose={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByRole('textbox', { name: 'Project name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mock.data!.projects[0].name).toBe('Renamed'));
    expect(screen.queryByText(/Switch to/)).not.toBeInTheDocument();
  });
});
