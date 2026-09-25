import type { PersistedData } from '@/types/electron-api';

export const WELCOME_PROJECT_ID = 'welcome';
export const WELCOME_TICKET_ID = 'welcome-1';

const today = () => new Date().toISOString().slice(0, 10);

/** What a brand-new workspace starts with: one project and one ticket that explain the app. */
export const welcomeData = (): PersistedData => {
  const now = today();
  return {
    projects: [
      {
        id: WELCOME_PROJECT_ID,
        name: 'Welcome',
        slug: 'welcome',
        icon: 'auto_awesome',
        color: '#1976d2',
        description:
          '# Welcome\n\nA starter project so you can see how Locket works. Rename it, edit this description, or delete it once you have created your own.',
      },
    ],
    tickets: [
      {
        id: WELCOME_TICKET_ID,
        projectId: WELCOME_PROJECT_ID,
        title: 'Welcome to Locket',
        description: [
          '## Getting started',
          '',
          'Locket is a local task planner. Everything stays on this machine.',
          '',
          '- **Projects** group tickets. Each project has a short slug that prefixes its ticket ids, like `welcome-1`.',
          '- **Tickets** have a status, a priority, labels, an optional due date and markdown descriptions like this one.',
          '- **Comments** live under each ticket. Try adding one below.',
          '',
          '## Working with AI agents',
          '',
          'Open **Settings** and start the MCP server. Any MCP-capable agent can then list, create and update your tickets.',
          '',
          '> Done reading? Mark this ticket as done, or delete the whole project from the sidebar.',
        ].join('\n'),
        status: 'todo',
        priority: 'medium',
        labels: [],
        due: null,
        author: 'Locket',
        created: now,
        updated: now,
        comments: [],
      },
    ],
    counters: { [WELCOME_PROJECT_ID]: 1 },
  };
};
