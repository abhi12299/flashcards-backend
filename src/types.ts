import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { createTagLoader } from './utils/createTagLoader';
import { createUserLoader } from './utils/createUserLoader';

export type MyContext = {
  req: Request & { user?: UserAuthTokenPayload };
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  tagLoader: ReturnType<typeof createTagLoader>;
};

export type UserAuthTokenPayload = {
  id: number;
};

export type ErrorResponse = {
  message: string;
  code: number;
};

export enum ErrorName {
  UNAUTHORIZED,
  INTERNAL_SERVER_ERROR,
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

export class CustomError extends Error {
  errorName: ErrorName;

  constructor(name: ErrorName) {
    super('');
    this.errorName = name;
  }
}
