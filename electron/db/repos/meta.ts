import type { EntityManager } from 'typeorm';
import { MetaEntity } from '../entities/meta.entity';

const INITIALIZED = 'initialized';

/** False until the workspace has been written once (first run). */
export const isInitialized = async (em: EntityManager): Promise<boolean> =>
  !!(await em.findOneBy(MetaEntity, { key: INITIALIZED }));

export const markInitialized = async (em: EntityManager): Promise<void> => {
  await em.save(MetaEntity, { key: INITIALIZED, value: '1' });
};
