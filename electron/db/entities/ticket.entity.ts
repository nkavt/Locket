import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('tickets')
export class TicketEntity {
  @PrimaryColumn('text') id!: string;
  @Index() @Column('text') projectId!: string;
  @Column('text') title!: string;
  @Column('text') description!: string;
  @Column('text') status!: string;
  @Column('text') priority!: string;
  @Column('simple-json') labels!: string[];
  @Column({ type: 'text', nullable: true }) due!: string | null;
  @Column('text') author!: string;
  @Column('text') created!: string;
  @Column('text') updated!: string;
}
