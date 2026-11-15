import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { app } from 'electron';
import * as path from 'node:path';
import { CommentEntity } from './entities/comment.entity';
import { CounterEntity } from './entities/counter.entity';
import { MetaEntity } from './entities/meta.entity';
import { ProjectEntity } from './entities/project.entity';
import { StatusEntity } from './entities/status.entity';
import { TicketEntity } from './entities/ticket.entity';
import { WorkflowEntity } from './entities/workflow.entity';
import { ensureDefault } from './repos/workflows';

let dataSource: DataSource | null = null;

export interface InitDbOptions {
  /** SQLite file path or ':memory:'. Defaults to `locket.db` in the app's userData directory. */
  database?: string;
}

export const initDb = async (options: InitDbOptions = {}): Promise<void> => {
  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: options.database ?? path.join(app.getPath('userData'), 'locket.db'),
    entities: [
      ProjectEntity,
      TicketEntity,
      CommentEntity,
      CounterEntity,
      MetaEntity,
      WorkflowEntity,
      StatusEntity,
    ],
    synchronize: true,
  });
  await dataSource.initialize();
  // Projects always point at a workflow: databases from before workflows get the default here.
  await ensureDefault(dataSource.manager);
};

export const closeDb = async (): Promise<void> => {
  await dataSource?.destroy();
  dataSource = null;
};

export const getDataSource = (): DataSource => {
  if (!dataSource) throw new Error('Database not initialized');
  return dataSource;
};
