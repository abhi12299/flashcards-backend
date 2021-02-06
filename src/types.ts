import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import Winston from 'winston';
import { createFlashcardLoader } from './utils/createFlashcardLoader';
import { createFlashcardStatsLoader } from './utils/createFlashcardStatsLoader';
import { createTagLoader } from './utils/createTagLoader';
import { createUserLoader } from './utils/createUserLoader';

export type MyContext = {
  req: Request & { user?: UserAuthTokenPayload };
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  tagLoader: ReturnType<typeof createTagLoader>;
  flashcardLoader: ReturnType<typeof createFlashcardLoader>;
  flashcardStatsLoader: ReturnType<typeof createFlashcardStatsLoader>;
  logger: Winston.Logger;
};

export type UserAuthTokenPayload = {
  id: number;
};

export type ErrorResponse = {
  message: string;
  code: number;
};

export enum ErrorName {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export enum FlashcardDifficulty {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
}

export enum FlashcardStatus {
  unattempted = 'unattempted',
  knowAnswer = 'knowAnswer',
  dontKnowAnswer = 'dontKnowAnswer',
}

export enum FlashcardVisibility {
  public = 'public',
  private = 'private',
  deleted = 'deleted',
}

export enum ReportTimespan {
  week = 'week',
  month = 'month',
}

export enum ReportGroupBy {
  difficulty = 'difficulty',
  answerStatus = 'status',
}

export class CustomError extends Error {
  static ignoredErrors: ErrorName[] = [ErrorName.UNAUTHORIZED];

  errorName: ErrorName;

  constructor(name: ErrorName) {
    super(name);
    this.errorName = name;
  }

  static isIgnoreable(err: Error): boolean {
    return this.ignoredErrors.includes(err.message as ErrorName);
  }
}
