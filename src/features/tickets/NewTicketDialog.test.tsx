import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewTicketDialog } from './NewTicketDialog';
import { makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent, waitFor } from '@/test/render';

const data = makeWorkspace();
const project = data.projects[0];

describe('NewTicketDialog', () => {
  beforeEach(() => seedLocalWorkspace(data));

  it('enables Create once a title is entered and reports the created ticket', async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <NewTicketDialog open project={project} onClose={onClose} onCreated={onCreated} />,
    );
    const create = screen.getByRole('button', { name: 'Create ticket' });
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Title'), 'Ship it');
    expect(create).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'bug' }));
    await userEvent.click(create);

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ship it', projectId: project.id, labels: ['bug'] }),
    );
    expect(onCreated.mock.calls[0][0].id).toMatch(new RegExp(`^${project.slug}-\\d+$`));
  });

  it('submits with cmd+enter from the title field', async () => {
    const onCreated = vi.fn();
    renderWithProviders(
      <NewTicketDialog open project={project} onClose={vi.fn()} onCreated={onCreated} />,
    );
    await userEvent.type(screen.getByLabelText('Title'), 'Quick{Meta>}{Enter}{/Meta}');
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
  });
});
