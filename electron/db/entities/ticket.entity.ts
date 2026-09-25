import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PersistedComment, PersistedTicket } from '../types';

@Entity('tickets')
export class TicketEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') projectId!: string;
  @Column('text') title!: string;
  @Column('text') description!: string;
  @Column('text') status!: string;
  @Column('text') priority!: string;
  @Column('simple-json') labels!: string[];
  @Column({ type: 'text', nullable: true }) due!: string | null;
  @Column('text') author!: string;
  @Column('text') created!: string;
  @Column('text') updated!: string;
  @Column('integer') position!: number;
}

/** Comments live in their own table, so the model is assembled from two row sets. */
export const toTicket = (e: TicketEntity, comments: PersistedComment[]): PersistedTicket => ({
  id: e.id,
  projectId: e.projectId,
  title: e.title,
  description: e.description,
  status: e.status,
  priority: e.priority,
  labels: e.labels,
  due: e.due,
  author: e.author,
  created: e.created,
  updated: e.updated,
  comments,
});

export const fromTicket = (t: PersistedTicket, position: number): TicketEntity => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  labels: t.labels || [],
  due: t.due ?? null,
  author: t.author,
  created: t.created,
  updated: t.updated,
  position,
});
