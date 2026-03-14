import { PrismaClient, AccountType, VoucherType, VoucherStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Fee seed cannot run.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function lineAmounts(debit: number, credit: number) {
  const amt = debit !== 0 ? debit : credit;
  return {
    fxRate: "1",
    amountLc: String(amt),
    amountFc: String(amt),
    debitLc: String(debit),
    creditLc: String(credit),
    debitFc: String(debit),
    creditFc: String(credit),
  } as const;
}

async function ensureVoucher(opts: {
  orgId: string;
  periodId: string;
  createdById: string;
  number: string;
  description: string;
  date: Date;
  lines: Array<{ lineNumber: number; accountId: string; debit: number; credit: number }>;
}) {
  const existing = await prisma.voucher.findFirst({
    where: { organisationId: opts.orgId, number: opts.number },
  });
  if (existing) return existing;

  return prisma.voucher.create({
    data: {
      organisationId: opts.orgId,
      type: VoucherType.JOURNAL,
      periodId: opts.periodId,
      number: opts.number,
      date: opts.date,
      description: opts.description,
      status: VoucherStatus.POSTED,
      createdById: opts.createdById,
      lines: {
        create: opts.lines.map((line) => ({
          lineNumber: line.lineNumber,
          accountId: line.accountId,
          currencyCode: "ZWG",
          ...lineAmounts(line.debit, line.credit),
        })),
      },
    },
  });
}

async function main() {
  const org = await prisma.organisation.findUnique({ where: { code: "DEMO001" } });
  if (!org) throw new Error("Organisation DEMO001 not found");
  const admin = await prisma.user.findUnique({ where: { email: "admin@school.ac.zw" } });
  if (!admin) throw new Error("Admin user not found");

  const period = await prisma.fiscalPeriod.findFirst({ where: { organisationId: org.id, year: 2026, period: 1 } });
  if (!period) throw new Error("Fiscal period not found");

  const ar = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1100" } });
  const revenue = await prisma.account.findFirst({ where: { organisationId: org.id, code: "4000" } });
  if (!ar || !revenue) throw new Error("Missing AR/Revenue accounts");

  const template = await prisma.feeTemplate.upsert({
    where: { organisationId_name_academicYear_term: { organisationId: org.id, name: "Tuition 2026 T1", academicYear: 2026, term: "Term 1" } },
    update: {},
    create: {
      organisationId: org.id,
      name: "Tuition 2026 T1",
      description: "Standard tuition fees",
      academicYear: 2026,
      term: "Term 1",
      grades: ["Form 1", "Form 2", "Form 3"],
      currencyCode: "ZWG",
      dueAfterDays: 30,
      items: {
        create: [
          { description: "Tuition", amount: "500" },
          { description: "Sports levy", amount: "50" },
        ],
      },
    },
  });

  const template2 = await prisma.feeTemplate.upsert({
    where: { organisationId_name_academicYear_term: { organisationId: org.id, name: "Tuition 2026 T1 Senior", academicYear: 2026, term: "Term 1" } },
    update: {},
    create: {
      organisationId: org.id,
      name: "Tuition 2026 T1 Senior",
      description: "Senior fees",
      academicYear: 2026,
      term: "Term 1",
      grades: ["Form 4", "Form 5", "Form 6"],
      currencyCode: "ZWG",
      dueAfterDays: 30,
      items: {
        create: [
          { description: "Tuition", amount: "600" },
          { description: "Lab levy", amount: "75" },
        ],
      },
    },
  });

  const batch = await prisma.feeGenerationBatch.upsert({
    where: { organisationId_batchNumber: { organisationId: org.id, batchNumber: "T1-2026-001" } },
    update: {},
    create: {
      organisationId: org.id,
      templateId: template.id,
      batchNumber: "T1-2026-001",
      academicYear: 2026,
      term: "Term 1",
      totalStudents: 50,
      totalAmount: "27500",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });

  const students = await prisma.student.findMany({ where: { organisationId: org.id }, take: 50 });

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const invNum = `FEE-${String(i + 1).padStart(4, "0")}`;
    const voucher = await ensureVoucher({
      orgId: org.id,
      periodId: period.id,
      createdById: admin.id,
      number: invNum,
      description: `Fee invoice ${student.studentNumber}`,
      date: new Date("2026-01-08"),
      lines: [
        { lineNumber: 1, accountId: ar.id, debit: 550, credit: 0 },
        { lineNumber: 2, accountId: revenue.id, debit: 0, credit: 550 },
      ],
    });

    await prisma.aRInvoice.upsert({
      where: { voucherId: voucher.id },
      update: {},
      create: {
        organisationId: org.id,
        voucherId: voucher.id,
        studentId: student.id,
        currencyCode: "ZWG",
        term: "Term 1",
        status: VoucherStatus.POSTED,
        amount: "550",
        balance: "550",
        dueDate: new Date("2026-02-07"),
        batchId: batch.id,
        lines: { create: [{ description: "Tuition + Sports", quantity: "1", unitPrice: "550", amount: "550" }] },
      },
    });
  }

  // second batch for senior
  await prisma.feeGenerationBatch.upsert({
    where: { organisationId_batchNumber: { organisationId: org.id, batchNumber: "T1-2026-002" } },
    update: {},
    create: {
      organisationId: org.id,
      templateId: template2.id,
      batchNumber: "T1-2026-002",
      academicYear: 2026,
      term: "Term 1",
      totalStudents: 30,
      totalAmount: "20250",
      status: "COMPLETED",
      createdById: admin.id,
    },
  });

  console.log("Fee templates + batches seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
