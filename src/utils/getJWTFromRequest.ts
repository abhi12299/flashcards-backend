import { Request } from 'express';

export const getJWTFromRequest = (req: Request): string | undefined => {
  const { authorization, Authorization } = req.headers;
  if (typeof authorization === 'string' && authorization.split(' ')[0] === 'Bearer') {
    return authorization.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  } else if (typeof Authorization === 'string' && Authorization.split(' ')[0] === 'Bearer') {
    return Authorization.split(' ')[1];
  }
  return;
};
