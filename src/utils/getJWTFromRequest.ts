import { Request } from 'express';

export const getJWTFromRequest = (req: Request): string | undefined => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  } else if (typeof req.headers.Authorization === 'string' && req.headers.Authorization.split(' ')[0] === 'Bearer') {
    return req.headers.Authorization.split(' ')[1];
  }
  return;
};
