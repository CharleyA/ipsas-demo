import { PrismaClient, AccountType } from "@prisma/client";
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

  const accounts = [
    { code: "1500", name: "Fixed Assets", type: AccountType.ASSET },
    { code: "1600", name: "Accumulated Depreciation", type: AccountType.ASSET },
    { code: "6100", name: "Depreciation Expense", type: AccountType.EXPENSE },
  ];

  for (const acct of accounts) {
    await prisma.account.upsert({
      where: { organisationId_code: { organisationId: org.id, code: acct.code } },
      update: {},
      create: { ...acct, organisationId: org.id },
    });
  }

  const assetAcct = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1500" } });
  const accumAcct = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1600" } });
  const depAcct = await prisma.account.findFirst({ where: { organisationId: org.id, code: "6100" } });
  if (!assetAcct || !accumAcct || !depAcct) throw new Error("Asset accounts missing");

  const category = await prisma.assetCategory.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "FA-COMPUTERS" } },
    update: { name: "Computers" },
    create: {
      organisationId: org.id,
      code: "FA-COMPUTERS",
      name: "Computers",
      assetAccountId: assetAcct.id,
      accumulatedDepAccountId: accumAcct.id,
      depreciationAccountId: depAcct.id,
      usefulLifeMonths: 36,
      residualValuePercent: "5",
    },
  });

  // create a few assets if none
  const count = await prisma.asset.count({ where: { organisationId: org.id } });
  if (count < 5) {
    const assets = Array.from({ length: 5 - count }).map((_, i) => ({
      organisationId: org.id,
      categoryId: category.id,
      assetNumber: `AST-2026-${String(i + 1).padStart(5, "0")}`,
      description: `Laptop ${i + 1}`,
      serialNumber: `SN-LAP-${i + 1}`,
      location: "ICT Lab",
      custodian: "IT Dept",
      acquisitionDate: new Date("2026-01-05"),
      acquisitionCost: "1200",
      residualValue: "60",
      netBookValue: "1200",
    }));
    await prisma.asset.createMany({ data: assets, skipDuplicates: true });
  }

  console.log("Asset categories + sample assets seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
