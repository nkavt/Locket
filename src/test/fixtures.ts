import type { Project, Ticket } from '@/data/types';

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
