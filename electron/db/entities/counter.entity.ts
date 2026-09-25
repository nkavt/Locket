import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Next ticket number per project, so ids stay unique after deletes. */
@Entity('counters')
export class CounterEntity {
  @PrimaryColumn('text') projectId!: string;
  @Column('integer') value!: number;
}
