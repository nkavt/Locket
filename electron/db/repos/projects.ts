import type { EntityManager } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';
import type { PersistedProject, ProjectPatch } from '../types';

const toModel = (e: ProjectEntity): PersistedProject => ({
  id: e.id,
  name: e.name,
  slug: e.slug,
  icon: e.icon,
  color: e.color,
  description: e.description,
});

/** All projects in creation order. */
export const findAll = async (em: EntityManager): Promise<PersistedProject[]> =>
  (await em.createQueryBuilder(ProjectEntity, 'p').orderBy('p.rowid').getMany()).map(toModel);

export const findById = async (em: EntityManager, id: string): Promise<PersistedProject | null> => {
  const e = await em.findOneBy(ProjectEntity, { id });
  return e && toModel(e);
};

export const findBySlug = async (
  em: EntityManager,
  slug: string,
): Promise<PersistedProject | null> => {
  const e = await em.findOneBy(ProjectEntity, { slug });
  return e && toModel(e);
};

export const insert = async (em: EntityManager, p: PersistedProject): Promise<void> => {
  await em.insert(ProjectEntity, p);
};

export const insertMany = async (em: EntityManager, ps: PersistedProject[]): Promise<void> => {
  if (ps.length) await em.insert(ProjectEntity, ps);
};

export const update = async (em: EntityManager, id: string, patch: ProjectPatch): Promise<void> => {
  if (Object.keys(patch).length) await em.update(ProjectEntity, { id }, patch);
};

export const remove = async (em: EntityManager, id: string): Promise<void> => {
  await em.delete(ProjectEntity, { id });
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(ProjectEntity);
};
