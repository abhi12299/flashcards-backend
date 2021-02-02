import { Field, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Flashcard } from './Flashcard';
import { Tag } from './Tag';

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column({ nullable: false })
  name!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Field()
  @Column({ nullable: true })
  profilePic?: string;

  @OneToMany(() => Flashcard, (card: Flashcard) => card.creator)
  flashcards: Flashcard[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[];

  @Field(() => Number)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Number)
  @UpdateDateColumn()
  updatedAt: Date;
}
