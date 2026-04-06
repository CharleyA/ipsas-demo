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

  const budget = await prisma.budget.findFirst({ where: { organisationId: org.id } , include: { lines: true }});
  if (!budget) throw new Error("Budget not found");

  const fundSports = await prisma.fund.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "SPORTS" } },
    update: { name: "Sports Fund" },
    create: { organisationId: org.id, code: "SPORTS", name: "Sports Fund" },
  });

  const costCentreSports = await prisma.costCentre.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "SPORTS" } },
    update: { name: "Sports Dept" },
    create: { organisationId: org.id, code: "SPORTS", name: "Sports Dept" },
  });

  const costCentreAdmin = await prisma.costCentre.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "ADMIN" } },
    update: { name: "Administration" },
    create: { organisationId: org.id, code: "ADMIN", name: "Administration" },
  });

  const expense = await prisma.account.findFirst({ where: { organisationId: org.id, code: "5000" } });
  if (!expense) throw new Error("Expense account not found");

  const existingKeys = new Set(budget.lines.map((l) => `${l.fundId}:${l.costCentreId}:${l.accountId}:${l.periodLabel ?? ""}`));

  const lines = [
    { fundId: fundSports.id, costCentreId: costCentreSports.id, accountId: expense.id, periodLabel: "Annual", amount: "8000" },
    { fundId: fundSports.id, costCentreId: costCentreAdmin.id, accountId: expense.id, periodLabel: "Annual", amount: "6000" },
  ].filter((l) => !existingKeys.has(`${l.fundId}:${l.costCentreId}:${l.accountId}:${l.periodLabel ?? ""}`));

  if (lines.length === 0) {
    console.log("No new budget lines to add");
    return;
  }

  await prisma.budgetLine.createMany({
    data: lines.map((l) => ({ ...l, budgetId: budget.id })),
  });

  console.log(`Added ${lines.length} budget lines`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
