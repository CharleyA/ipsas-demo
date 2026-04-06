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

  const cash = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1000" } });
  if (!cash) throw new Error("Cash account missing");

  const bank = await prisma.bankAccount.upsert({
    where: { accountId: cash.id },
    update: {},
    create: {
      organisationId: org.id,
      accountId: cash.id,
      bankName: "CBZ Bank",
      accountNumber: "00123456789",
      currencyCode: "ZWG",
    },
  });

  const imp = await prisma.bankStatementImport.create({
    data: {
      bankAccountId: bank.id,
      filename: "demo-statement-jan-2026.csv",
      rows: {
        create: Array.from({ length: 20 }).map((_, i) => {
          const credit = i % 2 === 0 ? 100 + i * 10 : null;
          const debit = i % 2 === 1 ? 50 + i * 5 : null;
          const amount = credit ?? debit ?? 0;
          return {
            date: new Date("2026-01-10"),
            description: credit ? `Fee receipt ${i + 1}` : `Payment ${i + 1}`,
            reference: `BNK-${String(i + 1).padStart(4, "0")}`,
            debit: debit ? String(debit) : null,
            credit: credit ? String(credit) : null,
            balance: null,
            amount: String(amount),
          };
        }),
      },
    },
  });

  console.log("Bank reconciliation demo created", imp.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
