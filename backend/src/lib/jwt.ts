import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './errors.js';

export type UserRole = 'admin' | 'teacher' | 'student';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  type: 'refresh';
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: randomUUID(),
  });
};

const assertTokenType = <T extends AccessTokenPayload | RefreshTokenPayload>(
  payload: unknown,
  type: T['type'],
): T => {
  if (!payload || typeof payload !== 'object' || (payload as { type?: unknown }).type !== type) {
    throw new HttpError(401, 'Invalid token type');
  }

  return payload as T;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return assertTokenType<AccessTokenPayload>(jwt.verify(token, env.JWT_ACCESS_SECRET), 'access');
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return assertTokenType<RefreshTokenPayload>(jwt.verify(token, env.JWT_REFRESH_SECRET), 'refresh');
};

export const signAuthToken = signAccessToken;
export const verifyAuthToken = verifyAccessToken;
