import { Field, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FlashcardDifficulty } from '../types';
import { Tag } from './Tag';
import { User } from './User';

@ObjectType()
@Entity()
export class Flashcard extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  body!: string;

  @Field()
  @Column({ nullable: false, default: false })
  isPublic: boolean;

  @Field()
  @Column({ nullable: false, default: false })
  isFork: boolean;

  @Field(() => FlashcardDifficulty)
  @Column({
    type: 'enum',
    enum: FlashcardDifficulty,
    default: FlashcardDifficulty.easy,
    nullable: false,
  })
  difficulty: FlashcardDifficulty;

  @Field(() => [Tag])
  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[];

  @Field()
  @Column()
  creatorId: number;

  @Field()
  @ManyToOne(() => User, (user) => user.flashcards)
  creator: User;

  @Field(() => Number)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Number)
  @UpdateDateColumn()
  updatedAt: Date;
}
