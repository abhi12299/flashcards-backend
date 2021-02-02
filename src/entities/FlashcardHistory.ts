import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FlashcardStatus } from '../types';

@Entity()
@Index(['flashcardId', 'userId'])
export class FlashcardHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  flashcardId!: number;

  @Column()
  @Index()
  userId!: number;

  @Column({
    nullable: false,
    default: FlashcardStatus.unattempted,
    enum: FlashcardStatus,
  })
  status!: FlashcardStatus;

  @Column({ nullable: true, type: 'float' })
  responseDuration?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
