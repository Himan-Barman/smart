import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

const randomQr = (): string => `SMARTCAMPUS-ATT-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

attendanceRouter.get(
  '/session/active',
  asyncHandler(async (_req, res) => {
    const session = await prisma.attendanceSession.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { attendees: true },
    });

    if (!session) {
      res.json(null);
      return;
    }

    res.json(serializer.attendanceSession(session, session.attendees));
  }),
);

const startSchema = z.object({
  courseName: z.string().min(1),
  courseCode: z.string().min(1),
  faculty: z.string().optional(),
  room: z.string().optional(),
  scheduleId: z.string().optional(),
});

attendanceRouter.post(
  '/session/start',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const payload = startSchema.parse(req.body);

    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const qr = randomQr();
    const session = await prisma.attendanceSession.create({
      data: {
        courseName: payload.courseName,
        courseCode: payload.courseCode,
        faculty: payload.faculty ?? 'Faculty',
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        currentQR: qr,
        qrHistory: qr,
        isActive: true,
        scheduleId: payload.scheduleId,
        room: payload.room,
        startedById: req.auth!.userId,
      },
      include: { attendees: true },
    });

    res.status(201).json(serializer.attendanceSession(session, session.attendees));
  }),
);

attendanceRouter.post(
  '/session/:id/stop',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Attendance session not found');
    }

    const session = await prisma.attendanceSession.update({
      where: { id },
      data: { isActive: false },
      include: { attendees: true },
    });

    res.json(serializer.attendanceSession(session, session.attendees));
  }),
);

attendanceRouter.post(
  '/session/:id/refresh',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const existing = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, 'Attendance session not found');
    }

    if (!existing.isActive) {
      throw new HttpError(400, 'Attendance session is not active');
    }

    const qr = randomQr();
    const history = serializer.toSubjectList(existing.qrHistory) ?? [];
    history.push(qr);

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: {
        currentQR: qr,
        qrHistory: serializer.fromSubjectList(history) ?? qr,
      },
      include: { attendees: true },
    });

    res.json(serializer.attendanceSession(updated, updated.attendees));
  }),
);

const markSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  qrCode: z.string().min(1),
});

attendanceRouter.post(
  '/session/:id/mark',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = markSchema.parse(req.body);

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { attendees: true },
    });

    if (!session || !session.isActive) {
      res.status(400).json({ success: false, message: 'No active session' });
      return;
    }

    if (payload.qrCode !== session.currentQR) {
      res.status(400).json({ success: false, message: 'QR code expired or invalid' });
      return;
    }

    const duplicate = session.attendees.some((attendee) => attendee.studentId === payload.studentId);
    if (duplicate) {
      res.status(409).json({ success: false, message: 'Attendance already marked' });
      return;
    }

    const attendee = await prisma.attendanceRecord.create({
      data: {
        sessionId: id,
        studentId: payload.studentId,
        studentName: payload.studentName,
        timestamp: new Date().toLocaleTimeString(),
        qrCode: payload.qrCode,
        verified: true,
        userId: req.auth!.userId,
      },
    });

    res.json({
      success: true,
      attendee: {
        studentId: attendee.studentId,
        studentName: attendee.studentName,
        timestamp: attendee.timestamp,
        qrCode: attendee.qrCode,
        verified: attendee.verified,
      },
    });
  }),
);

attendanceRouter.get(
  '/sessions',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.attendanceSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { attendees: true },
      take: 30,
    });

    res.json(sessions.map((session) => serializer.attendanceSession(session, session.attendees)));
  }),
);
