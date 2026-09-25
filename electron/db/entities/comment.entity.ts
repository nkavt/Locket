import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('comments')
export class CommentEntity {
  @PrimaryColumn('integer') id!: number;
  @Index() @PrimaryColumn('text') ticketId!: string;
  @Column('text') author!: string;
  @Column('text') ts!: string;
  @Column('text') body!: string;
}
