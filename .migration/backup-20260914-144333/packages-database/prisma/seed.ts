import { PrismaClient } from '@prisma/client';
import { seedAIConsultants } from './seed/ai-consultants';

const prisma = new PrismaClient();

async function main() {
  await seedAIConsultants();
  console.log('✅ Database seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
