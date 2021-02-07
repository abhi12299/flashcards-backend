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
import { Flashcard } from './Flashcard';
import { Tag } from './Tag';
import { User } from './User';

@ObjectType()
@Entity()
export class Collection extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  name!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Flashcard, (fc: Flashcard) => fc.collections)
  flashcards!: Flashcard[];

  @Field()
  @Column()
  creatorId!: number;

  @Field()
  @ManyToOne(() => User, (user) => user.collections)
  creator!: User;

  @Field(() => [Tag])
  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[];

  @Field()
  @Column()
  isPublic!: boolean;

  @Field(() => Number)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Number)
  @UpdateDateColumn()
  updatedAt: Date;
}
