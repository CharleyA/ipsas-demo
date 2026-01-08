import { PrismaClient, UserRole, OrganisationType, VoucherType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  // 2. Create Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.ac.zw';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // 3. Create Default Organisation
  const org = await prisma.organisation.upsert({
    where: { code: 'HQ' },
    update: {},
    create: {
      code: 'HQ',
      name: 'Ministry of Education - HQ',
      type: OrganisationType.MINISTRY,
      baseCurrency: 'ZWG',
    },
  });
  console.log(`Default organisation created: ${org.name}`);

  // 4. Link Admin to Organisation
  await prisma.organisationUser.upsert({
    where: {
      organisationId_userId: {
        organisationId: org.id,
        userId: admin.id,
      },
    },
    update: { role: UserRole.ADMIN },
    create: {
      organisationId: org.id,
      userId: admin.id,
      role: UserRole.ADMIN,
    },
  });
  console.log('Admin user linked to organisation.');

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
