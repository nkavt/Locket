import { beforeEach, describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';
import { makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent, waitFor, within } from '@/test/render';

const data = makeWorkspace();

describe('Sidebar', () => {
  beforeEach(() => seedLocalWorkspace(data));

  it('lists projects with ticket counts and links to them', async () => {
    const { router } = renderWithProviders(<Sidebar />);
    const first = data.projects[0];
    const count = data.tickets.filter((t) => t.projectId === first.id).length;
    const link = await screen.findByRole('link', { name: new RegExp(`${first.name}.*${count}`) });
    await userEvent.click(link);
    expect(router.state.location.pathname).toBe(`/projects/${first.id}`);
  });

  it('marks the active project from the URL', async () => {
    const second = data.projects[1];
    renderWithProviders(<Sidebar />, { route: `/projects/${second.id}/tickets/x` });
    expect(await screen.findByRole('link', { name: new RegExp(second.name) })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Settings/ })).not.toHaveAttribute('aria-current');
  });

  it('deletes a project from the context menu after confirming', async () => {
    const second = data.projects[1];
    renderWithProviders(<Sidebar />);
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: await screen.findByRole('link', { name: new RegExp(second.name) }),
    });
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete project' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(`"${second.name}" and all its tickets will be removed.`),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: new RegExp(second.name) })).not.toBeInTheDocument(),
    );
  });
});
