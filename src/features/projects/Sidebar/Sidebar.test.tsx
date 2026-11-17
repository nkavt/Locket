import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVED_OPEN_KEY, Sidebar } from './Sidebar';
import { makeProject, makeWorkspace, seedLocalWorkspace } from '@/test/fixtures';
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

  it('scrolls the active project into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const second = data.projects[1];
    renderWithProviders(<Sidebar />, { route: `/projects/${second.id}` });
    const link = await screen.findByRole('link', { name: new RegExp(second.name) });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' }));
    expect(scrollIntoView.mock.contexts).toContain(link);
    delete (Element.prototype as Partial<Element>).scrollIntoView;
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

  describe('archived projects', () => {
    const archivedSection = () => screen.findByRole('button', { name: /Archived · \d+/ });

    it('has no Archived section while nothing is archived', async () => {
      renderWithProviders(<Sidebar />);
      await screen.findByRole('link', { name: /Alpha/ });
      expect(screen.queryByRole('button', { name: /Archived/ })).not.toBeInTheDocument();
    });

    it('archives from the context menu into a collapsed section, and remembers opening it', async () => {
      renderWithProviders(<Sidebar />);
      await userEvent.pointer({
        keys: '[MouseRight]',
        target: await screen.findByRole('link', { name: /Beta/ }),
      });
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive project' }));

      const toggle = await archivedSection();
      expect(toggle).toHaveTextContent('Archived · 1');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('link', { name: /Beta/ })).not.toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('link', { name: /Beta/ })).toBeInTheDocument();
      expect(localStorage.getItem(ARCHIVED_OPEN_KEY)).toBe('1');
    });

    it('lists archived projects after active ones, most recently archived first', async () => {
      seedLocalWorkspace({
        ...data,
        projects: [
          { ...data.projects[0], archivedAt: '2026-01-01T00:00:00.000Z' },
          data.projects[1],
          makeProject({ id: 'gamma', name: 'Gamma', archivedAt: '2026-02-01T00:00:00.000Z' }),
        ],
      });
      localStorage.setItem(ARCHIVED_OPEN_KEY, '1');
      renderWithProviders(<Sidebar />);
      await archivedSection();
      expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
        expect.stringContaining('Beta'),
        expect.stringContaining('Gamma'),
        expect.stringContaining('Alpha'),
        expect.stringContaining('Settings'),
      ]);
    });

    it('opens the section when an archived project is the current page', async () => {
      seedLocalWorkspace({
        ...data,
        projects: [data.projects[0], { ...data.projects[1], archivedAt: '2026-01-01T00:00:00Z' }],
      });
      renderWithProviders(<Sidebar />, { route: `/projects/${data.projects[1].id}` });
      expect(await archivedSection()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('link', { name: /Beta/ })).toHaveAttribute('aria-current', 'page');
    });

    it('unarchives from the context menu', async () => {
      seedLocalWorkspace({
        ...data,
        projects: [data.projects[0], { ...data.projects[1], archivedAt: '2026-01-01T00:00:00Z' }],
      });
      localStorage.setItem(ARCHIVED_OPEN_KEY, '1');
      renderWithProviders(<Sidebar />);
      await userEvent.pointer({
        keys: '[MouseRight]',
        target: await screen.findByRole('link', { name: /Beta/ }),
      });
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Unarchive project' }));
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /Archived/ })).not.toBeInTheDocument(),
      );
      expect(screen.getByRole('link', { name: /Beta/ })).toBeInTheDocument();
    });
  });
});
