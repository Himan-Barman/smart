import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { getManagedUserData, type ManagedUserData } from '../../lib/managed-users.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const appDataRouter = Router();

appDataRouter.use(requireAuth);

const emptyManagedUserData = (): ManagedUserData => ({
  managedPersons: [],
  users: [],
});

const safeBootstrapQuery = async <T>(
  label: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await query();
  } catch (error) {
    console.error(`Bootstrap ${label} query failed`, error);
    return fallback;
  }
};

appDataRouter.get(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    const notices = await safeBootstrapQuery(
      'notices',
      () => prisma.notice.findMany({ orderBy: [{ pinned: 'desc' }, { date: 'desc' }] }),
      [],
    );
    const feedbacks = await safeBootstrapQuery(
      'feedbacks',
      () => prisma.feedback.findMany({ orderBy: { date: 'desc' } }),
      [],
    );
    const skills = await safeBootstrapQuery(
      'skills',
      () => prisma.skill.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      [],
    );
    const internships = await safeBootstrapQuery(
      'internships',
      () => prisma.internship.findMany({ orderBy: { deadline: 'asc' } }),
      [],
    );
    const rooms = await safeBootstrapQuery(
      'rooms',
      () => prisma.room.findMany({ orderBy: { name: 'asc' } }),
      [],
    );
    const bookings = await safeBootstrapQuery(
      'bookings',
      () => prisma.booking.findMany({ orderBy: [{ date: 'desc' }, { startTime: 'asc' }] }),
      [],
    );
    const grievances = await safeBootstrapQuery(
      'grievances',
      () => prisma.grievance.findMany({
        where:
          role === 'student'
            ? { submitterId: userId }
            : role === 'teacher'
              ? { OR: [{ assignedTo: 'TEACHER' }, { submitterId: userId }] }
              : undefined,
        orderBy: { date: 'desc' },
      }),
      [],
    );
    const activeSession = await safeBootstrapQuery(
      'active attendance session',
      () => prisma.attendanceSession.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { attendees: true },
      }),
      null,
    );
    const schedule = await safeBootstrapQuery(
      'schedule',
      () => prisma.scheduleSlot.findMany({ orderBy: [{ day: 'asc' }, { startTime: 'asc' }] }),
      [],
    );
    const departments = await safeBootstrapQuery(
      'departments',
      () => prisma.department.findMany({
        include: { semesters: { include: { subjects: true } } },
        orderBy: { name: 'asc' },
      }),
      [],
    );
    const notifications = await safeBootstrapQuery(
      'notifications',
      () => prisma.notification.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      [],
    );
    const managedUserData = await safeBootstrapQuery<ManagedUserData>(
      'managed users',
      async () => (role === 'admin' ? getManagedUserData() : emptyManagedUserData()),
      emptyManagedUserData(),
    );

    res.json({
      notices: notices.map((notice) => serializer.notice(notice)),
      feedbacks: feedbacks.map((feedback) => serializer.feedback(feedback)),
      userSkills: skills.map((skill) => serializer.skill(skill)),
      internships: internships.map((internship) => serializer.internship(internship)),
      rooms: rooms.map((room) => serializer.room(room)),
      bookings: bookings.map((booking) => serializer.booking(booking)),
      grievances: grievances.map((grievance) => serializer.grievance(grievance)),
      attendanceSession: activeSession ? serializer.attendanceSession(activeSession, activeSession.attendees) : null,
      schedule: schedule.map((slot) => serializer.schedule(slot)),
      departments: departments.map((department) => serializer.department(department)),
      notifications: notifications.map((notification) => serializer.notification(notification)),
      registeredPersons: managedUserData.managedPersons,
      registeredUsers: managedUserData.users.map((user) => serializer.user(user)),
    });
  }),
);
