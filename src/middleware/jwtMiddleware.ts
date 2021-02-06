import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserAuthTokenPayload } from '../types';
import { getJWTFromRequest } from '../utils/getJWTFromRequest';

export const jwtMiddleware = (req: Request, _: Response, next: NextFunction) => {
  const token = getJWTFromRequest(req);
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as UserAuthTokenPayload;
    (req as any).user = decoded;
  } catch (error) {
    // console.error(error);
  }
  next();
};
