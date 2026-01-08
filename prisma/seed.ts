import { PrismaClient, UserRole, OrganisationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

async function main() {
  console.log('Starting seed...');

  // 1. Seed Currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'ZWG', name: 'Zimbabwe Gold', symbol: 'ZWG', decimals: 2 },
  ];

  for (const curr of currencies) {
    await prisma.currency.upsert({
      where: { code: curr.code },
      update: {},
      create: curr,
    });
  }
  console.log('Currencies seeded.');

  // 2. Create Organisation: "Demo School"
  const org = await prisma.organisation.upsert({
    where: { code: 'DEMO001' },
    update: {
      name: 'Demo School',
    },
    create: {
      code: 'DEMO001',
      name: 'Demo School',
      type: OrganisationType.COMBINED_SCHOOL,
      baseCurrency: 'ZWG',
    },
  });
  console.log(`Organisation created/updated: ${org.name}`);

  // 3. Define Default Users
  const defaultUsers = [
    {
      email: process.env.ADMIN_EMAIL || 'admin@school.ac.zw',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
    },
    {
      email: 'clerk@school.ac.zw',
      password: 'Clerk@123',
      firstName: 'Data',
      lastName: 'Clerk',
      role: UserRole.CLERK,
    },
    {
      email: 'bursar@school.ac.zw',
      password: 'Bursar@123',
      firstName: 'Finance',
      lastName: 'Bursar',
      role: UserRole.BURSAR,
    },
    {
      email: 'headmaster@school.ac.zw',
      password: 'Headmaster@123',
      firstName: 'School',
      lastName: 'Headmaster',
      role: UserRole.HEADMASTER,
    },
    {
      email: 'auditor@school.ac.zw',
      password: 'Auditor@123',
      firstName: 'Internal',
      lastName: 'Auditor',
      role: UserRole.AUDITOR,
    },
  ];

  for (const userData of defaultUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      create: {
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    // Link user to organisation
    await prisma.organisationUser.upsert({
      where: {
        organisationId_userId: {
          organisationId: org.id,
          userId: user.id,
        },
      },
      update: {
        role: userData.role,
        isActive: true,
      },
      create: {
        organisationId: org.id,
        userId: user.id,
        role: userData.role,
        isActive: true,
      },
    });

    console.log(`User seeded: ${userData.email} (${userData.role})`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
