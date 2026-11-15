import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** One status of a workflow. Tickets store its id; ids are unique across workflows. */
@Entity('statuses')
export class StatusEntity {
  @PrimaryColumn('text') id!: string;
  @Index() @Column('text') workflowId!: string;
  @Column('text') name!: string;
  @Column('text') icon!: string;
  @Column('text') color!: string;
  /** todo, active, done or cancelled: what the status means, whatever it is called. */
  @Column('text') category!: string;
  @Column('integer') position!: number;
}
