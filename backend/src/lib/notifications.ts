import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))];

export const createUserNotifications = async (
  userIds: string[],
  title: string,
  desc: string,
  type: NotificationType = 'INFO',
): Promise<void> => {
  const recipients = unique(userIds);
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      title,
      desc,
      type,
    })),
  });
};

export const notifyAllNonAdminUsers = async (
  title: string,
  desc: string,
  type: NotificationType = 'INFO',
): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });

  await createUserNotifications(
    users
      .filter((user) => mapper.roleToClient(user.role) !== 'admin')
      .map((user) => user.id),
    title,
    desc,
    type,
  );
};
