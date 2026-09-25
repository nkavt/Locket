import type { EntityManager } from 'typeorm';
import { CounterEntity } from '../entities/counter.entity';

export const findAll = async (em: EntityManager): Promise<Record<string, number>> =>
  Object.fromEntries((await em.find(CounterEntity)).map((c) => [c.projectId, c.value]));

/** Increment a project's ticket counter and return the new value. Must run inside a transaction. */
export const next = async (em: EntityManager, projectId: string): Promise<number> => {
  const current = await em.findOneBy(CounterEntity, { projectId });
  const value = (current?.value ?? 0) + 1;
  await em.save(CounterEntity, { projectId, value });
  return value;
};

export const set = async (em: EntityManager, projectId: string, value: number): Promise<void> => {
  await em.save(CounterEntity, { projectId, value });
};

export const setMany = async (
  em: EntityManager,
  counters: Record<string, number>,
): Promise<void> => {
  const rows = Object.entries(counters).map(([projectId, value]) => ({ projectId, value }));
  if (rows.length) await em.insert(CounterEntity, rows);
};

export const remove = async (em: EntityManager, projectId: string): Promise<void> => {
  await em.delete(CounterEntity, { projectId });
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(CounterEntity);
};
