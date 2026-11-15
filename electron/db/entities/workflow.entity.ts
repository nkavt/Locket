import { Column, Entity, PrimaryColumn } from 'typeorm';

/** A named, ordered set of statuses that any number of projects share. */
@Entity('workflows')
export class WorkflowEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
}
