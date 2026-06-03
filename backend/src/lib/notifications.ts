import { mapper } from './mappers.js';
import { prisma } from './prisma.js';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))];
const NOTIFICATION_CHUNK_SIZE = 250;
const WRITE_RETRY_DELAYS_MS = [120, 350, 800];

const wait = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const chunks = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const withNotificationWriteRetry = async (
  label: string,
  operation: () => Promise<void>,
): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= WRITE_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === WRITE_RETRY_DELAYS_MS.length) break;
      await wait(WRITE_RETRY_DELAYS_MS[attempt]);
    }
  }

  console.error(`${label} failed after retries`, lastError);
  throw lastError;
};

export const createUserNotifications = async (
  userIds: string[],
  title: string,
  desc: string,
  type: NotificationType = 'INFO',
): Promise<void> => {
  const recipients = unique(userIds);
  if (recipients.length === 0) return;

  for (const recipientChunk of chunks(recipients, NOTIFICATION_CHUNK_SIZE)) {
    await withNotificationWriteRetry('notification fanout write', async () => {
      await prisma.notification.createMany({
        data: recipientChunk.map((userId) => ({
          userId,
          title,
          desc,
          type,
        })),
      });
    });
  }
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
