import type { AppData, LabelOption, PriorityOption, Project, StatusOption, Ticket } from './types';

export const APP_VERSION: string = __APP_VERSION__;

export const STATUSES: StatusOption[] = [
  {
    value: 'todo',
    icon: 'radio_button_unchecked',
    color: 'text.disabled',
  },
  { value: 'in_progress', icon: 'pending', color: 'info.main' },
  { value: 'done', icon: 'check_circle', color: 'success.main' },
];

export const PRIORITIES: PriorityOption[] = [
  { value: 'low', icon: 'arrow_downward' },
  { value: 'medium', icon: 'remove' },
  { value: 'high', icon: 'arrow_upward' },
];

export const LABEL_PALETTE: LabelOption[] = [
  { name: 'bug', color: '#d32f2f' },
  { name: 'feature', color: '#1976d2' },
  { name: 'enhancement', color: '#388e3c' },
  { name: 'docs', color: '#7b1fa2' },
  { name: 'design', color: '#ed6c02' },
  { name: 'urgent', color: '#c62828' },
  { name: 'good first issue', color: '#0288d1' },
  { name: 'research', color: '#5d4037' },
];

export const PROJECT_ICONS = [
  'rocket_launch',
  'language',
  'menu_book',
  'science',
  'palette',
  'bolt',
  'build',
  'extension',
  'auto_awesome',
  'forest',
  'public',
  'terminal',
];

export const PROJECT_COLORS = [
  '#1976d2',
  '#7b1fa2',
  '#2e7d32',
  '#ed6c02',
  '#c62828',
  '#00838f',
  '#5d4037',
  '#455a64',
];

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'locket',
    name: 'Locket App',
    slug: 'lkt',
    icon: 'rocket_launch',
    color: '#1976d2',
    description:
      '# Locket App\n\nThe app you are looking at right now. Self-hosted markdown task tracker with MCP server integration.\n\n## Goals\n- Local-first, file-based storage (`.md` files)\n- Project-scoped tickets with unique IDs\n- Optional MCP server for AI agent control',
  },
  {
    id: 'website',
    name: 'Marketing Site',
    slug: 'mkt',
    icon: 'language',
    color: '#7b1fa2',
    description: '# Marketing Site\n\nLanding page + docs for Locket.',
  },
  {
    id: 'docs',
    name: 'Internal Docs',
    slug: 'docs',
    icon: 'menu_book',
    color: '#2e7d32',
    description: '# Internal Docs\n\nWiki-style notes, RFCs, post-mortems.',
  },
];

export const SAMPLE_TICKETS: Ticket[] = [
  {
    id: 'lkt-1',
    projectId: 'locket',
    title: 'Add unique ticket IDs (`proj-N` format)',
    status: 'done',
    priority: 'high',
    labels: ['feature'],
    due: '2026-04-22',
    author: 'Ari Chen',
    description:
      '## Goal\n\nEvery ticket needs a stable, human-readable ID scoped to its project.\n\n```\n<project-slug>-<n>   e.g. lkt-1, mkt-12\n```\n\n### Acceptance criteria\n- [x] IDs auto-increment per project\n- [x] IDs are URL-safe and copyable\n- [ ] IDs visible in list & detail views\n\n> Slugs are immutable once a project has tickets.',
    created: '2026-04-18',
    updated: '2026-04-22',
    comments: [
      {
        id: 1,
        author: 'Sam Patel',
        ts: '2026-04-19T09:21',
        body: 'Should slugs be lowercase always? I vote yes.',
      },
      {
        id: 2,
        author: 'Ari Chen',
        ts: '2026-04-19T10:02',
        body: 'Lowercase and stripped to `[a-z0-9-]`. Edited.',
      },
      {
        id: 3,
        author: 'Jules Park',
        ts: '2026-04-21T15:40',
        body: 'Shipped — running well in the desktop build.',
      },
    ],
  },
  {
    id: 'lkt-2',
    projectId: 'locket',
    title: 'Markdown editor with toggle preview',
    status: 'in_progress',
    priority: 'high',
    labels: ['feature', 'design'],
    due: '2026-05-08',
    author: 'Jules Park',
    description:
      '## Markdown editing\n\nUsers should be able to **edit** raw markdown and **toggle** to a rendered preview. No live split — keep it simple.\n\n### UI\n- Edit mode: monospace textarea\n- Preview mode: rendered HTML\n- Toggle in the top-right of the description card\n\n### Tech\n- `marked` for parsing\n- Sanitize on render (TODO)',
    created: '2026-04-20',
    updated: '2026-04-29',
    comments: [
      {
        id: 1,
        author: 'Ari Chen',
        ts: '2026-04-25T11:00',
        body: 'Going with toggle-style editor. Live preview was too noisy in 6-pane window.',
      },
    ],
  },
  {
    id: 'lkt-3',
    projectId: 'locket',
    title: 'Threaded comments on tickets',
    status: 'in_progress',
    priority: 'medium',
    labels: ['feature'],
    due: '2026-05-12',
    author: 'Sam Patel',
    description:
      '## Comments\n\nFlat thread under each ticket. Each comment has:\n\n- Author avatar\n- Timestamp (relative + absolute on hover)\n- Markdown body\n- Optional image attachment\n\nNo nesting for v1 — just chronological.',
    created: '2026-04-21',
    updated: '2026-04-28',
    comments: [
      {
        id: 1,
        author: 'Jules Park',
        ts: '2026-04-26T14:11',
        body: 'Drag-and-drop image paste working ✨',
      },
    ],
  },
  {
    id: 'lkt-4',
    projectId: 'locket',
    title: 'MCP server: port config + start/stop',
    status: 'todo',
    priority: 'high',
    labels: ['feature'],
    due: '2026-05-15',
    author: 'Ari Chen',
    description:
      '## MCP integration\n\nAdd a **Settings** screen where the user can:\n\n1. Configure the MCP server port (default `7821`)\n2. Start / stop the server\n3. See the live status (running / stopped) and recent log lines\n\n### Notes\nServer exposes Locket data over MCP so AI agents can read/write tickets.',
    created: '2026-04-23',
    updated: '2026-04-23',
    comments: [],
  },
  {
    id: 'lkt-5',
    projectId: 'locket',
    title: 'Dark mode polish',
    status: 'todo',
    priority: 'low',
    labels: ['design', 'enhancement'],
    due: '2026-05-20',
    author: 'Jules Park',
    description:
      '## Dark mode\n\nSweep through all surfaces and make sure contrast hits WCAG AA.\n\n- [ ] Sidebar dividers\n- [ ] Selected row hover\n- [ ] Code block syntax (later)',
    created: '2026-04-24',
    updated: '2026-04-24',
    comments: [],
  },
  {
    id: 'lkt-6',
    projectId: 'locket',
    title: 'Keyboard shortcuts (cmd-k, j/k nav)',
    status: 'todo',
    priority: 'medium',
    labels: ['enhancement'],
    due: null,
    author: 'Sam Patel',
    description:
      '## Shortcuts\n\n- `⌘K` — quick switcher\n- `j` / `k` — next/prev ticket in list\n- `e` — edit description\n- `c` — new ticket',
    created: '2026-04-26',
    updated: '2026-04-26',
    comments: [],
  },
  {
    id: 'lkt-7',
    projectId: 'locket',
    title: 'Bug: empty state crashes on first launch',
    status: 'done',
    priority: 'high',
    labels: ['bug', 'urgent'],
    due: '2026-04-15',
    author: 'Ari Chen',
    description:
      '## Repro\n\nFresh install → open app → blank crash.\n\n## Root cause\n`projects[0]` was undefined; we now seed a starter project on first run.',
    created: '2026-04-12',
    updated: '2026-04-15',
    comments: [
      {
        id: 1,
        author: 'Sam Patel',
        ts: '2026-04-14T08:00',
        body: 'Confirmed fixed on my machine.',
      },
    ],
  },
  {
    id: 'mkt-1',
    projectId: 'website',
    title: 'Landing hero copy revisions',
    status: 'in_progress',
    priority: 'medium',
    labels: ['design'],
    due: '2026-05-10',
    author: 'Jules Park',
    description:
      '# Hero\n\nNeed sharper one-liner. Current: "Plan your work in markdown." → too dry.\n\n## Candidates\n1. Markdown for makers.\n2. Your tasks, in plain text.\n3. Plan it. Ship it. All in markdown.',
    created: '2026-04-22',
    updated: '2026-04-27',
    comments: [],
  },
  {
    id: 'mkt-2',
    projectId: 'website',
    title: 'Add changelog page',
    status: 'todo',
    priority: 'low',
    labels: ['feature', 'docs'],
    due: null,
    author: 'Sam Patel',
    description: '# Changelog\n\nPull from GitHub releases, render as markdown.',
    created: '2026-04-25',
    updated: '2026-04-25',
    comments: [],
  },
  {
    id: 'docs-1',
    projectId: 'docs',
    title: 'Onboarding doc for new contributors',
    status: 'todo',
    priority: 'medium',
    labels: ['docs', 'good first issue'],
    due: '2026-05-30',
    author: 'Ari Chen',
    description:
      '# Contributor onboarding\n\nCover:\n- Repo layout\n- How to run locally\n- Where state lives (markdown files in `~/.locket/`)',
    created: '2026-04-28',
    updated: '2026-04-28',
    comments: [],
  },
];

export const INITIAL_DATA: AppData = {
  projects: SAMPLE_PROJECTS,
  tickets: SAMPLE_TICKETS,
  counters: { locket: 7, website: 2, docs: 1 },
  settings: { mcpPort: 7821, mcpRunning: false },
};
