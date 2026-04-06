import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organisation.findUnique({ where: { code: "DEMO001" } });
  if (!org) throw new Error("Organisation not found");

  const period = await prisma.fiscalPeriod.findFirst({ where: { organisationId: org.id, year: 2026, period: 1 } });
  if (!period) throw new Error("Fiscal period not found");

  const admin = await prisma.user.findUnique({ where: { email: "admin@school.ac.zw" } });
  if (!admin) throw new Error("Admin not found");

  const fund = await prisma.fund.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "TUITION" } },
    update: { name: "Tuition Fund" },
    create: { organisationId: org.id, code: "TUITION", name: "Tuition Fund" },
  });

  const costCentre = await prisma.costCentre.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "SCI" } },
    update: { name: "Science Dept" },
    create: { organisationId: org.id, code: "SCI", name: "Science Dept" },
  });

  const account = await prisma.account.findFirst({ where: { organisationId: org.id, code: "5000" } });
  if (!account) throw new Error("Expense account not found");

  const existing = await prisma.budget.findFirst({ where: { organisationId: org.id, fiscalPeriodId: period.id } });
  if (existing) {
    console.log("Budget already exists");
    return;
  }

  await prisma.budget.create({
    data: {
      organisationId: org.id,
      fiscalPeriodId: period.id,
      status: "DRAFT",
      version: 1,
      notes: "Initial budget draft",
      createdById: admin.id,
      lines: {
        create: [
          {
            fundId: fund.id,
            costCentreId: costCentre.id,
            accountId: account.id,
            periodLabel: "Annual",
            amount: "15000",
          },
        ],
      },
    },
  });

  console.log("Budget seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
