import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column({ type: 'text', unique: true }) slug!: string;
  @Column('text') icon!: string;
  @Column('text') color!: string;
  @Column('text') description!: string;
}
