import { PrismaClient, UserRole, OrganisationType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Seed cannot run.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["info", "warn", "error"],
});

async function main() {
  console.log("Starting seed...");

  // 1. Seed Currencies
  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
    { code: "ZWG", name: "Zimbabwe Gold", symbol: "ZWG", decimals: 2 },
  ];

  for (const curr of currencies) {
    await prisma.currency.upsert({
      where: { code: curr.code },
      update: {},
      create: curr,
    });
  }
  console.log("Currencies seeded.");

  // 2. Create Organisation: "Demo School"
  const org = await prisma.organisation.upsert({
    where: { code: "DEMO001" },
    update: {
      name: "Demo School",
    },
    create: {
      code: "DEMO001",
      name: "Demo School",
      type: OrganisationType.COMBINED_SCHOOL,
      baseCurrency: "ZWG",
    },
  });
  console.log(`Organisation created/updated: ${org.name}`);

  // 3. Define Default Users with pre-hashed passwords (bcrypt cost 10)
  const defaultUsers = [
    {
      email: process.env.ADMIN_EMAIL || "admin@school.ac.zw",
      passwordHash: "$2b$10$FNmYlqLUih3wMLt2ZpHWV.VLHuLafwWeKWKoamTOVf6PEW4Z23fJu", // Admin@123
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.ADMIN,
    },
    {
      email: "clerk@school.ac.zw",
      passwordHash: "$2b$10$vk8X18gUtjRcVZW9hBS3m.Rp9oL/15UelrsHI7O7okCpphRBAgCT.", // Clerk@123
      firstName: "Data",
      lastName: "Clerk",
      role: UserRole.CLERK,
    },
    {
      email: "bursar@school.ac.zw",
      passwordHash: "$2b$10$HSuk2gwKS7PmBThaW/JBDexd2xbmAa9yJv0A5p0SttaZYPKbVvB5C", // Bursar@123
      firstName: "Finance",
      lastName: "Bursar",
      role: UserRole.BURSAR,
    },
    {
      email: "headmaster@school.ac.zw",
      passwordHash: "$2b$10$R713wKjdFyv1ArVcIVLrHOSZLyi4yL92jJaj1K5fQgydx8dNJG1WO", // Headmaster@123
      firstName: "School",
      lastName: "Headmaster",
      role: UserRole.HEADMASTER,
    },
    {
      email: "auditor@school.ac.zw",
      passwordHash: "$2b$10$OO9s37gYS7eQfQtHMpAKeea0AG/w9DTAqG3LkyNi/VI8O1HNjzwey", // Auditor@123
      firstName: "Internal",
      lastName: "Auditor",
      role: UserRole.AUDITOR,
    },
    {
      email: "accountant@school.ac.zw",
      passwordHash: "$2b$10$0q6Vq3a3s7f8V2i1n4k6Peis4u5y3zqT1r2o9NfR3b2q3oJQkV1bm", // Accountant@123
      firstName: "Accounts",
      lastName: "Officer",
      role: UserRole.ACCOUNTANT,
    },
  ];

  for (const userData of defaultUsers) {
    const { role, ...userCreate } = userData;
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
      },
      create: userCreate,
    });
  }
  console.log("Default users seeded.");

  // 4. Ensure users are linked to organisation
  const users = await prisma.user.findMany({
    where: { email: { in: defaultUsers.map((u) => u.email) } },
  });

  const roleByEmail = new Map(defaultUsers.map((u) => [u.email, u.role]));

  for (const user of users) {
    await prisma.organisationUser.upsert({
      where: {
        organisationId_userId: {
          organisationId: org.id,
          userId: user.id,
        },
      },
      update: {
        role: roleByEmail.get(user.email) || UserRole.CLERK,
        isActive: true,
      },
      create: {
        organisationId: org.id,
        userId: user.id,
        role: roleByEmail.get(user.email) || UserRole.CLERK,
        isActive: true,
      },
    });
  }
  console.log("Organisation users linked.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
