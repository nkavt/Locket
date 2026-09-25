import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('comments')
export class CommentEntity {
  @PrimaryColumn('integer') id!: number;
  @PrimaryColumn('text') ticketId!: string;
  @Column('text') author!: string;
  @Column('text') ts!: string;
  @Column('text') body!: string;
  @Column('integer') position!: number;
}
