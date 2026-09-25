export type StatusValue = 'todo' | 'in_progress' | 'done';
export type PriorityValue = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

export interface Comment {
  id: number;
  author: string;
  ts: string;
  body: string;
}

export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: StatusValue;
  priority: PriorityValue;
  labels: string[];
  due: string | null;
  author: string;
  created: string;
  updated: string;
  comments: Comment[];
}

export interface Settings {
  mcpPort: number;
  mcpRunning: boolean;
}

export interface AppData {
  projects: Project[];
  tickets: Ticket[];
  counters: Record<string, number>;
  settings: Settings;
}

export interface StatusOption {
  value: StatusValue;
  icon: string;
  /** MUI palette path, e.g. 'success.main' */
  color: string;
}

export interface PriorityOption {
  value: PriorityValue;
  icon: string;
}

export interface LabelOption {
  name: string;
  color: string;
}
