import { attachmentMarkdown } from '../attachments/rules';
import type {
  PersistedAttachment,
  PersistedStatus,
  PersistedTicket,
  PersistedWorkflow,
} from '../db/types';

export const ticketSummary = (t: PersistedTicket) => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  status: t.status,
  priority: t.priority,
  labels: t.labels,
  due: t.due,
  updated: t.updated,
  comments: t.comments.length,
  attachments: t.attachments?.length ?? 0,
});

const attachmentList = (list: PersistedAttachment[] | undefined): string =>
  (list ?? [])
    .map((a) => `- \`${a.name}\` (${a.mime}, ${a.size} bytes): \`${attachmentMarkdown(a.name)}\``)
    .join('\n');

/** What agents need to know about a workflow: the allowed statuses and what each means. */
export const workflowSummary = (w: PersistedWorkflow) => ({
  id: w.id,
  name: w.name,
  statuses: w.statuses.map(({ id, name, category }) => ({ id, name, category })),
});

/** `status` is the ticket's status as stored with its workflow, for showing its name. */
export const ticketToMarkdown = (t: PersistedTicket, status?: PersistedStatus): string => {
  const meta = [
    `- **Status:** ${status && status.name !== t.status ? `${status.name} (\`${t.status}\`)` : t.status}`,
    `- **Priority:** ${t.priority}`,
    `- **Labels:** ${t.labels.length ? t.labels.join(', ') : '_none_'}`,
    `- **Due:** ${t.due ?? '_none_'}`,
    `- **Author:** ${t.author}`,
    `- **Created:** ${t.created} · **Updated:** ${t.updated}`,
  ].join('\n');
  const comments = t.comments.length
    ? t.comments
        .map((c) => {
          const files = attachmentList(c.attachments);
          return `### ${c.author} · ${c.ts}\n\n${c.body}${files ? `\n\nAttachments:\n${files}` : ''}`;
        })
        .join('\n\n')
    : '_No comments yet._';
  const files = attachmentList(t.attachments);
  return `# ${t.id}: ${t.title}\n\n${meta}\n\n## Description\n\n${
    t.description || '_No description._'
  }\n\n${files ? `## Attachments\n\n${files}\n\n` : ''}## Comments\n\n${comments}\n`;
};
