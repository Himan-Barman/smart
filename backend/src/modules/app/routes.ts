import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { serializer } from '../../lib/serializers.js';
import { requireAuth } from '../../middleware/auth.js';

export const appDataRouter = Router();

appDataRouter.use(requireAuth);

appDataRouter.get(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const role = req.auth!.role;

    const [
      notices,
      feedbacks,
      skills,
      internships,
      rooms,
      bookings,
      grievances,
      activeSession,
      schedule,
      departments,
      notifications,
      registeredPersons,
      registeredUsers,
    ] = await Promise.all([
      prisma.notice.findMany({ orderBy: [{ pinned: 'desc' }, { date: 'desc' }] }),
      prisma.feedback.findMany({ orderBy: { date: 'desc' } }),
      prisma.skill.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
      prisma.internship.findMany({ orderBy: { deadline: 'asc' } }),
      prisma.room.findMany({ orderBy: { name: 'asc' } }),
      prisma.booking.findMany({ orderBy: [{ date: 'desc' }, { startTime: 'asc' }] }),
      prisma.grievance.findMany({
        where:
          role === 'student'
            ? { submitterId: userId }
            : role === 'teacher'
              ? { OR: [{ assignedTo: 'TEACHER' }, { submitterId: userId }] }
              : undefined,
        orderBy: { date: 'desc' },
      }),
      prisma.attendanceSession.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { attendees: true },
      }),
      prisma.scheduleSlot.findMany({ orderBy: [{ day: 'asc' }, { startTime: 'asc' }] }),
      prisma.department.findMany({ include: { semesters: { include: { subjects: true } } }, orderBy: { name: 'asc' } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      role === 'admin' ? prisma.registeredPerson.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
      role === 'admin' ? prisma.user.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    ]);

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
      registeredPersons: registeredPersons.map((person) => serializer.registeredPerson(person)),
      registeredUsers: registeredUsers.map((user) => serializer.user(user)),
    });
  }),
);
