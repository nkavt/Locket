import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column({ type: 'text', unique: true }) slug!: string;
  @Column('text') icon!: string;
  @Column('text') color!: string;
  @Column('text') description!: string;
  // Projects from before workflows existed get the default one when the column is added.
  @Column({ type: 'text', default: 'default' }) workflowId!: string;
}
