import { Field, ObjectType } from 'type-graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FlashcardStatus } from '../types';

@Entity()
@ObjectType()
@Index(['flashcardId', 'userId'])
export class FlashcardHistory extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  @Index()
  flashcardId!: number;

  @Field()
  @Column()
  @Index()
  userId!: number;

  @Field(() => FlashcardStatus)
  @Column({
    nullable: false,
    default: FlashcardStatus.unattempted,
    enum: FlashcardStatus,
  })
  status!: FlashcardStatus;

  @Field()
  @Column({ nullable: true, type: 'float' })
  responseDuration?: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
