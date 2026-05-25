import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // Update the email to the verified Resend recipient for testing
  const person = await p.registeredPerson.update({
    where: { id: 'STU100' },
    data: { email: 'isrhimanbarman@gmail.com' },
  });
  console.log('Updated:', person.name, '→', person.email);
}

main()
  .catch((e) => console.error(e.message))
  .finally(() => p.$disconnect());
