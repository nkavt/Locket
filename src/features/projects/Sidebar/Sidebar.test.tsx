import { describe, expect, it } from 'vitest';
import { Sidebar } from './Sidebar';
import { INITIAL_DATA } from '@/data/constants';
import { renderWithProviders, screen, userEvent, within } from '@/test/render';

describe('Sidebar', () => {
  it('lists projects with ticket counts and links to them', async () => {
    const { router } = renderWithProviders(<Sidebar />);
    const first = INITIAL_DATA.projects[0];
    const count = INITIAL_DATA.tickets.filter((t) => t.projectId === first.id).length;
    const link = screen.getByRole('link', { name: new RegExp(`${first.name}.*${count}`) });
    await userEvent.click(link);
    expect(router.state.location.pathname).toBe(`/projects/${first.id}`);
  });

  it('marks the active project from the URL', () => {
    const second = INITIAL_DATA.projects[1];
    renderWithProviders(<Sidebar />, { route: `/projects/${second.id}/tickets/x` });
    expect(screen.getByRole('link', { name: new RegExp(second.name) })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Settings/ })).not.toHaveAttribute('aria-current');
  });

  it('deletes a project from the context menu after confirming', async () => {
    const second = INITIAL_DATA.projects[1];
    renderWithProviders(<Sidebar />);
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('link', { name: new RegExp(second.name) }),
    });
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete project' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(`"${second.name}" and all its tickets will be removed.`),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('link', { name: new RegExp(second.name) })).not.toBeInTheDocument();
  });
});
