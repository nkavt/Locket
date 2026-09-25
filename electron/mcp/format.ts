import type { PersistedTicket } from '../db/types';

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
});

export const ticketToMarkdown = (t: PersistedTicket): string => {
  const meta = [
    `- **Status:** ${t.status}`,
    `- **Priority:** ${t.priority}`,
    `- **Labels:** ${t.labels.length ? t.labels.join(', ') : '_none_'}`,
    `- **Due:** ${t.due ?? '_none_'}`,
    `- **Author:** ${t.author}`,
    `- **Created:** ${t.created} · **Updated:** ${t.updated}`,
  ].join('\n');
  const comments = t.comments.length
    ? t.comments.map((c) => `### ${c.author} · ${c.ts}\n\n${c.body}`).join('\n\n')
    : '_No comments yet._';
  return `# ${t.id}: ${t.title}\n\n${meta}\n\n## Description\n\n${
    t.description || '_No description._'
  }\n\n## Comments\n\n${comments}\n`;
};
