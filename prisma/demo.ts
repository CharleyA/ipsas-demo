import { PrismaClient, AccountType, VoucherType, VoucherStatus, ApprovalStatus, OrganisationType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Demo seed cannot run.");
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
  type: VoucherType;
  description: string;
  date: Date;
  status?: VoucherStatus;
  lines: Array<{ lineNumber: number; accountId: string; debit: number; credit: number }>;
}) {
  const existing = await prisma.voucher.findFirst({
    where: { organisationId: opts.orgId, number: opts.number },
  });
  if (existing) return existing;

  return prisma.voucher.create({
    data: {
      organisationId: opts.orgId,
      type: opts.type,
      periodId: opts.periodId,
      number: opts.number,
      date: opts.date,
      description: opts.description,
      status: opts.status ?? VoucherStatus.POSTED,
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

async function ensureGLForVoucher(voucherId: string, orgId: string, periodId: string, entryNumber: string, date: Date) {
  const existing = await prisma.gLHeader.findFirst({ where: { voucherId } });
  if (existing) return existing;

  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId }, include: { lines: true } });
  if (!voucher) return null;

  return prisma.gLHeader.create({
    data: {
      organisationId: orgId,
      periodId,
      voucherId: voucher.id,
      entryNumber,
      entryDate: date,
      description: voucher.description,
      entries: {
        create: voucher.lines.map((line, idx) => ({
          lineNumber: idx + 1,
          accountId: line.accountId,
          currencyCode: line.currencyCode,
          fxRate: line.fxRate,
          amountLc: line.amountLc,
          amountFc: line.amountFc,
          debitLc: line.debitLc,
          creditLc: line.creditLc,
          debitFc: line.debitFc,
          creditFc: line.creditFc,
        })),
      },
    },
  });
}

async function main() {
  const org = await prisma.organisation.upsert({
    where: { code: "DEMO001" },
    update: { name: "Demo School" },
    create: { code: "DEMO001", name: "Demo School", type: OrganisationType.COMBINED_SCHOOL, baseCurrency: "ZWG" },
  });

  const admin = await prisma.user.findUnique({ where: { email: "admin@school.ac.zw" } });
  if (!admin) throw new Error("Admin user not found");
  const auditor = await prisma.user.findUnique({ where: { email: "auditor@school.ac.zw" } });

  // Fiscal period
  const period = await prisma.fiscalPeriod.upsert({
    where: { organisationId_year_period: { organisationId: org.id, year: 2026, period: 1 } },
    update: {},
    create: {
      organisationId: org.id,
      year: 2026,
      period: 1,
      name: "Jan 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    },
  });

  // Accounts
  const accounts = [
    { code: "1000", name: "Cash", type: AccountType.ASSET },
    { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET },
    { code: "2000", name: "Accounts Payable", type: AccountType.LIABILITY },
    { code: "3000", name: "Net Assets", type: AccountType.NET_ASSETS_EQUITY },
    { code: "4000", name: "School Fees", type: AccountType.REVENUE },
    { code: "5000", name: "Supplies Expense", type: AccountType.EXPENSE },
  ];

  for (const acct of accounts) {
    await prisma.account.upsert({
      where: { organisationId_code: { organisationId: org.id, code: acct.code } },
      update: {},
      create: { ...acct, organisationId: org.id },
    });
  }

  const cash = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1000" } });
  const ar = await prisma.account.findFirst({ where: { organisationId: org.id, code: "1100" } });
  const ap = await prisma.account.findFirst({ where: { organisationId: org.id, code: "2000" } });
  const equity = await prisma.account.findFirst({ where: { organisationId: org.id, code: "3000" } });
  const revenue = await prisma.account.findFirst({ where: { organisationId: org.id, code: "4000" } });
  const expense = await prisma.account.findFirst({ where: { organisationId: org.id, code: "5000" } });

  if (!cash || !ar || !ap || !equity || !revenue || !expense) throw new Error("Missing demo accounts");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      arReceivableAccountId: ar.id,
      arRevenueAccountId: revenue.id,
      apPayableAccountId: ap.id,
      apExpenseAccountId: expense.id,
      cashInHandAccountId: cash.id,
    },
  });

  // Students (50)
  const existing = await prisma.student.count({ where: { organisationId: org.id } });
  if (existing < 50) {
    const students = Array.from({ length: 50 - existing }).map((_, i) => {
      const num = String(existing + i + 1).padStart(4, "0");
      return {
        organisationId: org.id,
        studentNumber: `S${num}`,
        firstName: `Student${num}`,
        lastName: "Demo",
        grade: "Form 1",
        class: "A",
        isActive: true,
      };
    });
    await prisma.student.createMany({ data: students, skipDuplicates: true });
  }

  const student = await prisma.student.findFirst({ where: { organisationId: org.id } });
  if (!student) throw new Error("No student found");

  // Supplier
  const supplier = await prisma.supplier.upsert({
    where: { organisationId_code: { organisationId: org.id, code: "SUP-001" } },
    update: { name: "Stationery World" },
    create: { organisationId: org.id, code: "SUP-001", name: "Stationery World" },
  });

  // Vouchers
  const jv = await ensureVoucher({
    orgId: org.id,
    periodId: period.id,
    createdById: admin.id,
    number: "JV-0001",
    type: VoucherType.JOURNAL,
    description: "Opening balance",
    date: new Date("2026-01-02"),
    status: VoucherStatus.POSTED,
    lines: [
      { lineNumber: 1, accountId: cash.id, debit: 1000, credit: 0 },
      { lineNumber: 2, accountId: equity.id, debit: 0, credit: 1000 },
    ],
  });

  const arVoucher = await ensureVoucher({
    orgId: org.id,
    periodId: period.id,
    createdById: admin.id,
    number: "ARI-0001",
    type: VoucherType.JOURNAL,
    description: "Tuition invoice",
    date: new Date("2026-01-10"),
    status: VoucherStatus.POSTED,
    lines: [
      { lineNumber: 1, accountId: ar.id, debit: 500, credit: 0 },
      { lineNumber: 2, accountId: revenue.id, debit: 0, credit: 500 },
    ],
  });

  const rcVoucher = await ensureVoucher({
    orgId: org.id,
    periodId: period.id,
    createdById: admin.id,
    number: "RC-0001",
    type: VoucherType.RECEIPT,
    description: "Receipt for tuition",
    date: new Date("2026-01-12"),
    status: VoucherStatus.POSTED,
    lines: [
      { lineNumber: 1, accountId: cash.id, debit: 400, credit: 0 },
      { lineNumber: 2, accountId: ar.id, debit: 0, credit: 400 },
    ],
  });

  const apVoucher = await ensureVoucher({
    orgId: org.id,
    periodId: period.id,
    createdById: admin.id,
    number: "APB-0001",
    type: VoucherType.JOURNAL,
    description: "Stationery bill",
    date: new Date("2026-01-15"),
    status: VoucherStatus.POSTED,
    lines: [
      { lineNumber: 1, accountId: expense.id, debit: 300, credit: 0 },
      { lineNumber: 2, accountId: ap.id, debit: 0, credit: 300 },
    ],
  });

  const payVoucher = await ensureVoucher({
    orgId: org.id,
    periodId: period.id,
    createdById: admin.id,
    number: "PAY-0001",
    type: VoucherType.PAYMENT,
    description: "Pay stationery supplier",
    date: new Date("2026-01-20"),
    status: VoucherStatus.POSTED,
    lines: [
      { lineNumber: 1, accountId: ap.id, debit: 300, credit: 0 },
      { lineNumber: 2, accountId: cash.id, debit: 0, credit: 300 },
    ],
  });

  // AR Invoice + lines
  const arInvoice = await prisma.aRInvoice.upsert({
    where: { voucherId: arVoucher.id },
    update: {},
    create: {
      organisationId: org.id,
      voucherId: arVoucher.id,
      studentId: student.id,
      currencyCode: "ZWG",
      term: "Term 1",
      status: VoucherStatus.POSTED,
      amount: "500",
      balance: "100",
      dueDate: new Date("2026-01-31"),
      lines: {
        create: [
          { description: "Tuition", quantity: "1", unitPrice: "500", amount: "500" },
        ],
      },
    },
  });

  // AR Receipt + allocation
  const arReceipt = await prisma.aRReceipt.upsert({
    where: { voucherId: rcVoucher.id },
    update: {},
    create: {
      organisationId: org.id,
      voucherId: rcVoucher.id,
      studentId: student.id,
      currencyCode: "ZWG",
      amount: "400",
      unallocated: "0",
      paymentMethod: "Cash",
      reference: "RCPT-001",
    },
  });

  await prisma.aRAllocation.upsert({
    where: { id: `${arInvoice.id}_${arReceipt.id}` },
    update: { amount: "400" },
    create: { id: `${arInvoice.id}_${arReceipt.id}`, invoiceId: arInvoice.id, receiptId: arReceipt.id, amount: "400" },
  });

  // AP Bill + lines
  const apBill = await prisma.aPBill.upsert({
    where: { voucherId: apVoucher.id },
    update: {},
    create: {
      organisationId: org.id,
      voucherId: apVoucher.id,
      supplierId: supplier.id,
      currencyCode: "ZWG",
      amount: "300",
      balance: "0",
      dueDate: new Date("2026-01-30"),
      lines: {
        create: [
          { description: "Stationery", quantity: "10", unitPrice: "30", amount: "300" },
        ],
      },
    },
  });

  // AP Payment + allocation
  const apPayment = await prisma.aPPayment.upsert({
    where: { voucherId: payVoucher.id },
    update: {},
    create: {
      organisationId: org.id,
      voucherId: payVoucher.id,
      supplierId: supplier.id,
      currencyCode: "ZWG",
      amount: "300",
      unallocated: "0",
    },
  });

  await prisma.aPAllocation.upsert({
    where: { id: `${apBill.id}_${apPayment.id}` },
    update: { amount: "300" },
    create: { id: `${apBill.id}_${apPayment.id}`, billId: apBill.id, paymentId: apPayment.id, amount: "300" },
  });

  // GL headers
  await ensureGLForVoucher(jv.id, org.id, period.id, "GL-JV-0001", new Date("2026-01-02"));
  await ensureGLForVoucher(arVoucher.id, org.id, period.id, "GL-ARI-0001", new Date("2026-01-10"));
  await ensureGLForVoucher(rcVoucher.id, org.id, period.id, "GL-RC-0001", new Date("2026-01-12"));
  await ensureGLForVoucher(apVoucher.id, org.id, period.id, "GL-APB-0001", new Date("2026-01-15"));
  await ensureGLForVoucher(payVoucher.id, org.id, period.id, "GL-PAY-0001", new Date("2026-01-20"));

  // Approval tasks
  if (auditor) {
    const vouchers = [jv, arVoucher, rcVoucher, apVoucher, payVoucher];
    for (const v of vouchers) {
      await prisma.approvalTask.upsert({
        where: { id: `appr_${v.id}_${auditor.id}` },
        update: { status: ApprovalStatus.PENDING },
        create: { id: `appr_${v.id}_${auditor.id}`, voucherId: v.id, userId: auditor.id, status: ApprovalStatus.PENDING, notes: "Demo approval task" },
      });
    }
  }

  console.log("Demo transactions seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
