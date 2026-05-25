import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { signAuthToken } from '../../lib/jwt.js';
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

const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

// ─── LOGIN ───
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(404, 'No account found with this email. Please sign up first.');
    }

    const validPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!validPassword) {
      throw new HttpError(401, 'Incorrect password. Please try again.');
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: serializer.user(user).role,
    });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
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

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: serializer.user(user).role,
    });

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
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
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    res.json({
      user: serializer.user(user),
    });
  }),
);
