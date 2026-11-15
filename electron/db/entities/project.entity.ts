import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column({ type: 'text', unique: true }) slug!: string;
  @Column('text') icon!: string;
  @Column('text') color!: string;
  @Column('text') description!: string;
  /** ISO time the project was archived; null while it is active. Added as a nullable column, so
   * schema sync gives existing projects null. */
  @Column({ type: 'text', nullable: true, default: null }) archivedAt!: string | null;
}
