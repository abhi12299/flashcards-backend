import { Field, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Flashcard } from './Flashcard';
import { User } from './User';

@ObjectType()
@Entity()
export class Tag extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => Flashcard, (fc: Flashcard) => fc.tags)
  flashcards: Flashcard[];

  @ManyToMany(() => User, (user) => user.tags)
  users: User[];

  @Field(() => Number)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Number)
  @UpdateDateColumn()
  updatedAt: Date;
}
