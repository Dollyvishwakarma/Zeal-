import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'packages/database/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: 'packages/database/prisma/migrations',
    seed: 'tsx packages/database/prisma/seed/index.ts',
  },
});
