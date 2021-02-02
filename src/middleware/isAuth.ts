import { MiddlewareFn } from 'type-graphql';
import { CustomError, ErrorName, MyContext } from '../types';

export const isAuth: MiddlewareFn<MyContext> = async ({ context }, next) => {
  const { req } = context;
  if (!req.user) {
    throw new CustomError(ErrorName.UNAUTHORIZED);
  }
  return next();
};
