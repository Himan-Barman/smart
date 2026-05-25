import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_ID = 'ADMIN001';
const ADMIN_EMAIL = 'admin@technoindiaeducation.com';
const ADMIN_PASSWORD = 'Admin@SmartCampus2026';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Clean up any existing admin with this ID or email
  await prisma.notification.deleteMany({ where: { userId: ADMIN_ID } });
  await prisma.skill.deleteMany({ where: { userId: ADMIN_ID } });
  await prisma.feedback.deleteMany({ where: { userId: ADMIN_ID } });
  await prisma.user.deleteMany({ where: { OR: [{ id: ADMIN_ID }, { email: ADMIN_EMAIL }] } });

  const admin = await prisma.user.create({
    data: {
      id: ADMIN_ID,
      name: 'Campus Administrator',
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      department: 'Administration',
      passwordHash,
    },
  });

  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│          ✅  Admin Account Created               │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│  Username:  admin                               │`);
  console.log(`│  Password:  ${ADMIN_PASSWORD}       │`);
  console.log(`│  Email:     ${admin.email}  │`);
  console.log(`│  Role:      ${admin.role}                            │`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  Login → type "admin" in the username field     │');
  console.log('│  The domain @technoindiaeducation.com is auto   │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Failed to seed admin:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
