import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { app } from 'electron';
import * as path from 'node:path';
import {
  CommentEntity,
  CounterEntity,
  MetaEntity,
  ProjectEntity,
  TicketEntity,
} from './entities';

export interface PersistedComment {
  id: number;
  author: string;
  ts: string;
  body: string;
}

export interface PersistedTicket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  labels: string[];
  due: string | null;
  author: string;
  created: string;
  updated: string;
  comments: PersistedComment[];
}

export interface PersistedProject {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

export interface PersistedData {
  projects: PersistedProject[];
  tickets: PersistedTicket[];
  counters: Record<string, number>;
}

let dataSource: DataSource | null = null;

export const initDb = async (): Promise<void> => {
  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: path.join(app.getPath('userData'), 'locket.db'),
    entities: [ProjectEntity, TicketEntity, CommentEntity, CounterEntity, MetaEntity],
    synchronize: true,
  });
  await dataSource.initialize();
};

const getDataSource = (): DataSource => {
  if (!dataSource) throw new Error('Database not initialized');
  return dataSource;
};

// null means "never saved" (first run) — distinct from a legitimately empty workspace
export const loadData = async (): Promise<PersistedData | null> => {
  const ds = getDataSource();
  const initialized = await ds
    .getRepository(MetaEntity)
    .findOneBy({ key: 'initialized' });
  if (!initialized) return null;

  const [projects, tickets, comments, counters] = await Promise.all([
    ds.getRepository(ProjectEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(TicketEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CommentEntity).find({ order: { position: 'ASC' } }),
    ds.getRepository(CounterEntity).find(),
  ]);

  const commentsByTicket = new Map<string, PersistedComment[]>();
  for (const c of comments) {
    const list = commentsByTicket.get(c.ticketId) || [];
    list.push({ id: c.id, author: c.author, ts: c.ts, body: c.body });
    commentsByTicket.set(c.ticketId, list);
  }

  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      icon: p.icon,
      color: p.color,
      description: p.description,
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      labels: t.labels,
      due: t.due,
      author: t.author,
      created: t.created,
      updated: t.updated,
      comments: commentsByTicket.get(t.id) || [],
    })),
    counters: Object.fromEntries(counters.map((c) => [c.projectId, c.value])),
  };
};

const validateData = (data: PersistedData): void => {
  if (
    !data ||
    !Array.isArray(data.projects) ||
    !Array.isArray(data.tickets) ||
    typeof data.counters !== 'object' ||
    data.counters === null
  ) {
    throw new Error('Invalid data payload');
  }
};

export const saveData = async (data: PersistedData): Promise<void> => {
  validateData(data);
  const ds = getDataSource();
  await ds.transaction(async (em) => {
    await em.clear(CommentEntity);
    await em.clear(TicketEntity);
    await em.clear(ProjectEntity);
    await em.clear(CounterEntity);

    await em.save(
      ProjectEntity,
      data.projects.map((p, i) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        icon: p.icon,
        color: p.color,
        description: p.description,
        position: i,
      })),
    );
    await em.save(
      TicketEntity,
      data.tickets.map((t, i) => ({
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
        position: i,
      })),
    );
    await em.save(
      CommentEntity,
      data.tickets.flatMap((t) =>
        (t.comments || []).map((c, i) => ({
          id: c.id,
          ticketId: t.id,
          author: c.author,
          ts: c.ts,
          body: c.body,
          position: i,
        })),
      ),
    );
    await em.save(
      CounterEntity,
      Object.entries(data.counters).map(([projectId, value]) => ({
        projectId,
        value,
      })),
    );
    await em.save(MetaEntity, { key: 'initialized', value: '1' });
  });
};
