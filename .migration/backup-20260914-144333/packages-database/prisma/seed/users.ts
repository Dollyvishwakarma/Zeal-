import { Role } from '@prisma/client';

export const users = [
  {
    email: 'admin@zeal.com',
    username: 'super_admin',
    name: 'Super Admin',
    role: Role.SUPER_ADMIN,
    isVerified: true,
  },
  {
    email: 'user@zeal.com',
    username: 'test_user',
    name: 'Test User',
    role: Role.USER,
    isVerified: true,
  },
  {
    email: 'consultant@zeal.com',
    username: 'test_consultant',
    name: 'Test Consultant',
    role: Role.HEALER,
    isVerified: true,
  },
];
