import type { Project, Ticket } from '@/data/types';
import type { PersistedData } from '@/types/electron-api';

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    slug: 'tst',
    icon: 'rocket_launch',
    color: '#1976d2',
    description: '# Test',
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'tst-1',
    projectId: 'proj-1',
    title: 'A ticket',
    description: '',
    status: 'todo',
    priority: 'medium',
    labels: [],
    due: null,
    author: 'Ari',
    created: '2026-01-01',
    updated: '2026-01-01',
    comments: [],
    ...overrides,
  };
}

/** A two-project workspace for component tests. */
export function makeWorkspace(): PersistedData {
  const alpha = makeProject({ id: 'alpha', name: 'Alpha', slug: 'alp' });
  const beta = makeProject({ id: 'beta', name: 'Beta', slug: 'bet', icon: 'language' });
  return {
    projects: [alpha, beta],
    tickets: [
      makeTicket({ id: 'alp-1', projectId: 'alpha', title: 'First alpha ticket' }),
      makeTicket({ id: 'alp-2', projectId: 'alpha', title: 'Second alpha ticket', status: 'done' }),
      makeTicket({ id: 'bet-1', projectId: 'beta', title: 'Only beta ticket' }),
    ],
    counters: { alpha: 2, beta: 1 },
  };
}

/** Put a workspace into localStorage so the browser backend loads it on hydrate. */
export function seedLocalWorkspace(data: PersistedData = makeWorkspace()): PersistedData {
  localStorage.setItem('locket-app-state-v1', JSON.stringify(data));
  return data;
}
