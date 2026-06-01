import type { Prisma } from '@prisma/client';
import { mapper } from './mappers.js';
import { prisma } from './prisma.js';
import { serializer } from './serializers.js';

const registeredPersonSelect = {
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

const userSelect = {
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

type ManagedRegisteredPersonRecord = Prisma.RegisteredPersonGetPayload<{
  select: typeof registeredPersonSelect;
}>;

export type ManagedUserRecord = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

export type ManagedPerson = ReturnType<typeof serializer.registeredPerson> & {
  isVerified: boolean;
  createdAt: string;
};

export type ManagedUserData = {
  managedPersons: ManagedPerson[];
  users: ManagedUserRecord[];
};

export const isAdminRole = (role: string): boolean => mapper.roleToClient(role) === 'admin';

const isSameIdentity = (person: ManagedRegisteredPersonRecord, user: ManagedUserRecord): boolean => {
  const personEmail = person.email.toLowerCase();
  const userEmail = user.email.toLowerCase();

  return (
    person.id === user.id ||
    personEmail === userEmail ||
    Boolean(person.enrollmentNo && person.enrollmentNo === user.enrollmentNo) ||
    Boolean(person.employeeId && person.employeeId === user.employeeId)
  );
};

const serializeAccountAsManagedPerson = (user: ManagedUserRecord): ManagedPerson => ({
  ...serializer.user(user),
  isVerified: true,
  createdAt: user.createdAt.toISOString(),
});

export const getNonAdminUsers = async (): Promise<ManagedUserRecord[]> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userSelect,
  });

  return users.filter((user) => !isAdminRole(user.role));
};

export const getManagedUserData = async (): Promise<ManagedUserData> => {
  const persons = await prisma.registeredPerson.findMany({
    orderBy: { createdAt: 'desc' },
    select: registeredPersonSelect,
  });
  const users = await getNonAdminUsers();

  const matchedUserIds = new Set<string>();
  const managedPersons = persons.map((person) => {
    const account = users.find((user) => isSameIdentity(person, user)) ?? null;
    if (account) matchedUserIds.add(account.id);

    return {
      ...serializer.registeredPerson(person),
      isVerified: account !== null,
      createdAt: person.createdAt.toISOString(),
    };
  });

  const orphanAccounts = users
    .filter((user) => !matchedUserIds.has(user.id))
    .map((user) => serializeAccountAsManagedPerson(user));

  return {
    managedPersons: [...managedPersons, ...orphanAccounts].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    users,
  };
};
