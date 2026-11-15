import type { LabelOption, PriorityOption, Settings } from './types';

export const APP_VERSION: string = __APP_VERSION__;

// Statuses come from each project's workflow: see data/workflows.ts.

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

export const DEFAULT_SETTINGS: Settings = {
  mcpPort: 7821,
  mcpRunning: false,
};
