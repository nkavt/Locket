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
  archivedAt: e.archivedAt ?? null,
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

const toRow = (p: PersistedProject): ProjectEntity => ({ ...p, archivedAt: p.archivedAt ?? null });

export const insert = async (em: EntityManager, p: PersistedProject): Promise<void> => {
  await em.insert(ProjectEntity, toRow(p));
};

export const insertMany = async (em: EntityManager, ps: PersistedProject[]): Promise<void> => {
  if (ps.length) await em.insert(ProjectEntity, ps.map(toRow));
};

/** Column changes: the editable fields plus `archivedAt` (the service decides its value). */
export type ProjectChanges = Omit<ProjectPatch, 'archived'> & { archivedAt?: string | null };

export const update = async (
  em: EntityManager,
  id: string,
  patch: ProjectChanges,
): Promise<void> => {
  if (Object.keys(patch).length) await em.update(ProjectEntity, { id }, patch);
};

export const remove = async (em: EntityManager, id: string): Promise<void> => {
  await em.delete(ProjectEntity, { id });
};

export const clear = async (em: EntityManager): Promise<void> => {
  await em.clear(ProjectEntity);
};
