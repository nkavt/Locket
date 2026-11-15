import type { Workflow } from './workflows';

export type { StatusCategory, Workflow, WorkflowStatus } from './workflows';

/** A status id from the ticket's project workflow (e.g. "todo" on the default workflow). */
export type StatusValue = string;
export type PriorityValue = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  /** Whose statuses this project's tickets use. */
  workflowId: string;
}

/** Image metadata. The bytes are fetched on demand (see `useAttachmentUrl`). */
export interface Attachment {
  /** Unique within the ticket; markdown shows it with `![](<name>)`. */
  name: string;
  mime: string;
  size: number;
}

export interface Comment {
  id: number;
  author: string;
  ts: string;
  body: string;
  attachments?: Attachment[];
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
  /** Images on the ticket itself; comment images live on each comment. */
  attachments?: Attachment[];
}

export interface Settings {
  mcpPort: number;
  mcpRunning: boolean;
}

export interface AppData {
  workflows: Workflow[];
  projects: Project[];
  tickets: Ticket[];
  counters: Record<string, number>;
  settings: Settings;
}

export interface PriorityOption {
  value: PriorityValue;
  icon: string;
}

export interface LabelOption {
  name: string;
  color: string;
}
