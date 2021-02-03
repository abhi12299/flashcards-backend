import { IsArray, IsString, Length, MinLength } from 'class-validator';
import { Field, InputType, Int, ObjectType } from 'type-graphql';
import { Flashcard } from '../entities/Flashcard';
import { FlashcardHistory } from '../entities/FlashcardHistory';
import { User } from '../entities/User';
import { FlashcardDifficulty, FlashcardStatus } from '../types';

@InputType()
export class CreateFlashcardInput {
  @Field()
  @Length(5, 100, { message: 'Title must be between 5-100 characters' })
  title!: string;

  @Field()
  @Length(10, undefined, { message: 'Body must be at least 10 characters' })
  body!: string;

  @Field(() => [String])
  @IsArray({ each: true, message: 'Tags must be an array of strings' })
  @IsString({ each: true })
  @Length(1, undefined, { each: true, message: 'Tags must be strings' })
  tags!: string[];

  @Field(() => FlashcardDifficulty)
  difficulty!: FlashcardDifficulty;

  @Field()
  isPublic?: boolean;
}

@InputType()
export class UpdateFlashcardInput {
  @Field(() => Int)
  id!: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  body?: string;

  @Field(() => [String], { nullable: true })
  @MinLength(1, { each: true })
  @IsArray({ each: true, message: 'Tags must be an array of strings' })
  @IsString({ each: true })
  @Length(1, undefined, { each: true, message: 'Tags must be strings' })
  tags?: string[];

  @Field({ nullable: true })
  isPublic?: boolean;
}

@InputType()
export class GetFlashcardsInput {
  @Field(() => Int)
  limit!: number;

  @Field({ nullable: true })
  cursor?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType()
export class GetFlashcardsHistoryInput {
  @Field(() => Int)
  limit!: number;

  @Field({ nullable: true })
  cursor?: string;
}

@InputType()
export class RespondToFlashcardInput {
  @Field(() => Int)
  id!: number;

  @Field(() => FlashcardStatus)
  type!: FlashcardStatus;

  @Field({ nullable: true })
  duration?: number;
}

@ObjectType()
export class PaginatedFlashcards {
  @Field(() => [Flashcard])
  flashcards: Flashcard[];

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class PaginatedFlashcardsHistory {
  @Field(() => [FlashcardHistory])
  flashcardHistory: FlashcardHistory[];

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class CreateFlashcardResponse {
  @Field(() => Flashcard, { nullable: true })
  flashcard?: Flashcard;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Boolean, { nullable: true })
  isNewUser?: boolean;

  @Field(() => String, { nullable: true })
  accessToken?: string;
}

@ObjectType()
export class UpdateFlashcardResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Flashcard, { nullable: true })
  flashcard?: Flashcard;
}

@ObjectType()
export class ForkFlashcardResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field()
  done!: boolean;
}

@ObjectType()
export class RespondToFlashcardResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field()
  done!: boolean;
}

@ObjectType()
export class FlashcardStats {
  @Field()
  avgTime!: number;

  @Field()
  numAttempts!: number;
}

@ObjectType()
export class FlashcardStatsResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => FlashcardStats, { nullable: true })
  stats?: FlashcardStats;
}
