import type { EntityManager } from 'typeorm';
import { StatusEntity } from '../entities/status.entity';
import { WorkflowEntity } from '../entities/workflow.entity';
import {
  DEFAULT_WORKFLOW,
  DEFAULT_WORKFLOW_ID,
  type PersistedStatus,
  type PersistedWorkflow,
  type StatusCategory,
} from '../../workflows/rules';

const toStatus = (e: StatusEntity): PersistedStatus => ({
  id: e.id,
  name: e.name,
  icon: e.icon,
  color: e.color,
  category: e.category as StatusCategory,
});

const statusRows = (w: PersistedWorkflow): StatusEntity[] =>
  w.statuses.map((s, position) => ({ ...s, workflowId: w.id, position }));

/** All workflows in creation order, each with its statuses in board order. */
export const findAll = async (em: EntityManager): Promise<PersistedWorkflow[]> => {
  const [workflows, statuses] = await Promise.all([
    em.createQueryBuilder(WorkflowEntity, 'w').orderBy('w.rowid').getMany(),
    em.find(StatusEntity, { order: { position: 'ASC' } }),
  ]);
  return workflows.map((w) => ({
    id: w.id,
    name: w.name,
    statuses: statuses.filter((s) => s.workflowId === w.id).map(toStatus),
  }));
};

export const findById = async (
  em: EntityManager,
  id: string,
): Promise<PersistedWorkflow | null> => {
  const w = await em.findOneBy(WorkflowEntity, { id });
  if (!w) return null;
  const statuses = await em.find(StatusEntity, {
    where: { workflowId: id },
    order: { position: 'ASC' },
  });
  return { id: w.id, name: w.name, statuses: statuses.map(toStatus) };
};

/** Ids of every status in every workflow, so new ones never clash. */
export const statusIds = async (em: EntityManager): Promise<Set<string>> =>
  new Set((await em.find(StatusEntity, { select: { id: true } })).map((s) => s.id));

export const workflowIds = async (em: EntityManager): Promise<Set<string>> =>
  new Set((await em.find(WorkflowEntity, { select: { id: true } })).map((w) => w.id));

export const insert = async (em: EntityManager, w: PersistedWorkflow): Promise<void> => {
  await em.insert(WorkflowEntity, { id: w.id, name: w.name });
  if (w.statuses.length) await em.insert(StatusEntity, statusRows(w));
};

export const insertMany = async (em: EntityManager, ws: PersistedWorkflow[]): Promise<void> => {
  for (const w of ws) await insert(em, w);
};

/** Store the workflow's name and replace its statuses with `w.statuses`. */
export const save = async (em: EntityManager, w: PersistedWorkflow): Promise<void> => {
  await em.update(WorkflowEntity, { id: w.id }, { name: w.name });
  await em.delete(StatusEntity, { workflowId: w.id });
  if (w.statuses.length) await em.insert(StatusEntity, statusRows(w));
};

export const remove = async (em: EntityManager, id: string): Promise<void> => {
  await em.delete(StatusEntity, { workflowId: id });
  await em.delete(WorkflowEntity, { id });
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(StatusEntity);
  await em.clear(WorkflowEntity);
};

/** Seed the default workflow if it is missing (first start, upgrade, after a replace). */
export const ensureDefault = async (em: EntityManager): Promise<void> => {
  if (await em.findOneBy(WorkflowEntity, { id: DEFAULT_WORKFLOW_ID })) return;
  await insert(em, DEFAULT_WORKFLOW);
};
