import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') name!: string;
  @Column('text') slug!: string;
  @Column('text') icon!: string;
  @Column('text') color!: string;
  @Column('text') description!: string;
  @Column('integer') position!: number;
}

@Entity('tickets')
export class TicketEntity {
  @PrimaryColumn('text') id!: string;
  @Column('text') projectId!: string;
  @Column('text') title!: string;
  @Column('text') description!: string;
  @Column('text') status!: string;
  @Column('text') priority!: string;
  @Column('simple-json') labels!: string[];
  @Column({ type: 'text', nullable: true }) due!: string | null;
  @Column('text') author!: string;
  @Column('text') created!: string;
  @Column('text') updated!: string;
  @Column('integer') position!: number;
}

@Entity('comments')
export class CommentEntity {
  @PrimaryColumn('integer') id!: number;
  @PrimaryColumn('text') ticketId!: string;
  @Column('text') author!: string;
  @Column('text') ts!: string;
  @Column('text') body!: string;
  @Column('integer') position!: number;
}

@Entity('counters')
export class CounterEntity {
  @PrimaryColumn('text') projectId!: string;
  @Column('integer') value!: number;
}

@Entity('meta')
export class MetaEntity {
  @PrimaryColumn('text') key!: string;
  @Column('text') value!: string;
}
