import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Key/value flags about the database itself, e.g. whether it was ever saved. */
@Entity('meta')
export class MetaEntity {
  @PrimaryColumn('text') key!: string;
  @Column('text') value!: string;
}
