import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router, type CookieOptions, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { env } from '../../config/env.js';
import { ensureAuthSessionTable, isMissingAuthSessionTableError } from '../../lib/auth-session-store.js';
import { HttpError } from '../../lib/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';
import { sendOtpEmail } from '../../lib/email.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const startSignupSchema = z.object({
  email: z.string().email(),
  identifier: z.string().regex(/^\d{12}$/, 'University ID must be exactly 12 digits'),
});

const verifyOtpOnlySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const verifySignupSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  enrollmentNo: true,
  employeeId: true,
  semester: true,
  course: true,
  subjects: true,
  phone: true,
  passwordHash: true,
  createdAt: true,
} as const;

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  enrollmentNo: true,
  employeeId: true,
  semester: true,
  course: true,
  subjects: true,
  phone: true,
  createdAt: true,
} as const;

type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;
type CurrentUser = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>;

const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const hashRefreshToken = (refreshToken: string): string =>
  createHmac('sha256', env.JWT_REFRESH_SECRET).update(refreshToken).digest('hex');

const refreshTokenMatches = (refreshToken: string, expectedHash: string): boolean => {
  const actualHash = hashRefreshToken(refreshToken);
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const parseDurationMs = (duration: string): number => {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return 60 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitMs[unit];
};

const refreshTokenTtlMs = (): number => parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);

const refreshCookieSameSite = (): 'lax' | 'strict' | 'none' =>
  env.REFRESH_COOKIE_SAME_SITE ?? (env.NODE_ENV === 'production' ? 'none' : 'lax');

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: refreshCookieSameSite(),
  path: '/api/v1/auth',
  maxAge: refreshTokenTtlMs(),
});

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: refreshCookieSameSite(),
    path: '/api/v1/auth',
  });
};

const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieOptions());
};

const accessTokenFor = (user: AuthUser | CurrentUser): string =>
  signAccessToken({
    sub: user.id,
    email: user.email,
    role: serializer.user(user).role,
  });

const createSession = async (user: AuthUser | CurrentUser, req: Request, res: Response): Promise<string> => {
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, sessionId });
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs());

  const data = {
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  };

  try {
    await prisma.authSession.create({ data });
  } catch (error) {
    if (!isMissingAuthSessionTableError(error)) {
      throw error;
    }

    await ensureAuthSessionTable();
    await prisma.authSession.create({ data });
  }

  setRefreshCookie(res, refreshToken);
  return accessTokenFor(user);
};

const rotateSession = async (refreshToken: string, res: Response): Promise<{ accessToken: string; user: CurrentUser }> => {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const session = await prisma.authSession.findUnique({
    where: { id: payload.sessionId },
    include: { user: { select: currentUserSelect } },
  });

  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    clearRefreshCookie(res);
    throw new HttpError(401, 'Session expired');
  }

  const validToken = refreshTokenMatches(refreshToken, session.refreshTokenHash);
  if (!validToken) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    clearRefreshCookie(res);
    throw new HttpError(401, 'Refresh token reuse detected');
  }

  const nextRefreshToken = signRefreshToken({ sub: session.userId, sessionId: session.id });
  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
    },
  });

  setRefreshCookie(res, nextRefreshToken);

  return {
    accessToken: accessTokenFor(session.user),
    user: session.user,
  };
};

// ─── LOGIN ───
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email }, select: authUserSelect });
    if (!user) {
      throw new HttpError(404, 'No account found with this email. Please sign up first.');
    }

    const validPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!validPassword) {
      throw new HttpError(401, 'Incorrect password. Please try again.');
    }

    const accessToken = await createSession(user, req, res);

    res.json({
      success: true,
      message: 'Login successful!',
      accessToken,
      user: serializer.user(user),
    });
  }),
);

// ─── SIGNUP STEP 1: SEND OTP ───
authRouter.post(
  '/signup/start',
  asyncHandler(async (req, res) => {
    const payload = startSignupSchema.parse(req.body);
    const email = payload.email.toLowerCase();
    const identifier = payload.identifier.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpError(409, 'An account already exists with this email. Please log in.');
    }

    const personByEmail = await prisma.registeredPerson.findUnique({ where: { email } });
    const person =
      personByEmail &&
      [personByEmail.enrollmentNo, personByEmail.employeeId]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase() === identifier)
        ? personByEmail
        : null;

    if (!person) {
      throw new HttpError(404, 'Your details were not found in the university database. Please contact the admin.');
    }

    await prisma.otpCode.deleteMany({ where: { email } });

    const code = generateOtp();
    await prisma.otpCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send OTP via email
    await sendOtpEmail(email, code, person.name);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      otpEmail: email,
      person: serializer.registeredPerson(person),
    });
  }),
);

// ─── SIGNUP STEP 2: VERIFY OTP ONLY (no account creation) ───
authRouter.post(
  '/signup/verify-otp',
  asyncHandler(async (req, res) => {
    const payload = verifyOtpOnlySchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const otp = await prisma.otpCode.findFirst({
      where: { email, code: payload.code },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'Invalid or expired OTP. Please try again.');
    }

    res.json({
      success: true,
      message: 'OTP verified successfully!',
    });
  }),
);

// ─── SIGNUP STEP 3: SET PASSWORD & CREATE ACCOUNT ───
authRouter.post(
  '/signup/verify',
  asyncHandler(async (req, res) => {
    const payload = verifySignupSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const otp = await prisma.otpCode.findFirst({
      where: { email, code: payload.code },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'Invalid OTP. Please check and try again.');
    }

    const person = await prisma.registeredPerson.findUnique({ where: { email } });
    if (!person) {
      throw new HttpError(404, 'Session expired. Please try signing up again.');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpError(409, 'An account already exists with this email. Please log in.');
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: person.email,
        role: person.role,
        department: person.department,
        enrollmentNo: person.enrollmentNo,
        employeeId: person.employeeId,
        semester: person.semester,
        course: person.course,
        subjects: person.subjects,
        phone: person.phone,
        passwordHash,
        registeredPersonId: person.id,
      },
    });

    await prisma.otpCode.deleteMany({ where: { email } });

    const accessToken = await createSession(user, req, res);

    res.json({
      success: true,
      message: 'Account created successfully!',
      accessToken,
      user: serializer.user(user),
    });
  }),
);

// ─── RESEND OTP ───
authRouter.post(
  '/signup/resend',
  asyncHandler(async (req, res) => {
    const payload = resendSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const person = await prisma.registeredPerson.findUnique({ where: { email } });
    if (!person) {
      throw new HttpError(404, 'Session expired. Please try signing up again.');
    }

    // Clear old codes before generating a new one
    await prisma.otpCode.deleteMany({ where: { email } });

    const code = generateOtp();
    await prisma.otpCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send OTP via email
    await sendOtpEmail(email, code, person.name);

    res.json({
      success: true,
      message: `Verification code resent to ${email}`,
      otpEmail: email,
    });
  }),
);

// ─── CURRENT USER ───
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
    if (!refreshToken) {
      clearRefreshCookie(res);
      throw new HttpError(401, 'Missing refresh token');
    }

    const { accessToken, user } = await rotateSession(refreshToken, res);

    res.json({
      success: true,
      accessToken,
      user: serializer.user(user),
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.authSession.updateMany({
          where: { id: payload.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Clear malformed or expired cookies without leaking session state.
      }
    }

    clearRefreshCookie(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  }),
);

authRouter.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await prisma.authSession.updateMany({
      where: { userId: req.auth!.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    clearRefreshCookie(res);
    res.json({ success: true, revokedSessions: result.count });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: currentUserSelect });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    res.json({
      user: serializer.user(user),
    });
  }),
);
