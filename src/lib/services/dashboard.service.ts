import prisma from "@/lib/db";
import { Prisma, VoucherStatus, AccountType } from "@prisma/client";
import { startOfMonth } from "date-fns";
import { ExceptionReportService } from "./exception-report.service";
import { ReportService } from "./report.service";

const { Decimal } = Prisma;

export class DashboardService {
  static async getHeadmasterMetrics(organisationId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);

    // 1. Cash at bank (Sum of all bank accounts linked to GL accounts)
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organisationId },
      select: { accountId: true }
    });
    const bankAccountIds = bankAccounts.map(ba => ba.accountId);

    const bankBalances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId },
        accountId: { in: bankAccountIds }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const cashAtBank = bankBalances.reduce((acc, b) => {
      const bal = (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0));
      return acc.add(bal);
    }, new Decimal(0));

    // 2. Cash in Hand (Sum of accounts marked as isCashAccount)
    const cashAccounts = await prisma.account.findMany({
      where: { organisationId, isCashAccount: true },
      select: { id: true }
    });
    const cashAccountIds = cashAccounts.map(ca => ca.id);

    const cashBalances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId },
        accountId: { in: cashAccountIds }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const cashInHand = cashBalances.reduce((acc, b) => {
      const bal = (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0));
      return acc.add(bal);
    }, new Decimal(0));

    // 3. Fees Arrears Ageing Summary (Total receivables balance)
    const receivablesAgg = await prisma.aRInvoice.aggregate({
      where: { organisationId, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const feesArrears = receivablesAgg._sum.balance || new Decimal(0);

    // 4. Approvals Pending
    const pendingApprovals = await prisma.voucher.count({
      where: { organisationId, status: VoucherStatus.SUBMITTED }
    });

    // 5. Top spending categories (Expenses by Account Type / Name)
    const expenseEntries = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { 
          organisationId,
          entryDate: { gte: monthStart }
        },
        account: { type: AccountType.EXPENSE }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const accountIds = expenseEntries.map(e => e.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true }
    });

    const topSpending = expenseEntries.map(e => {
      const account = accounts.find(a => a.id === e.accountId);
      const net = (e._sum.debitLc || new Decimal(0)).minus(e._sum.creditLc || new Decimal(0));
      return {
        name: account?.name || "Unknown",
        amount: net
      };
    })
    .sort((a, b) => b.amount.comparedTo(a.amount))
    .slice(0, 5);

    // 6. Budget Utilisation (Mocked for now since budget model is simple)
    const budgetUtilisation = 65;

    // 7. Student count
    const studentCount = await prisma.student.count({
      where: { organisationId, isActive: true }
    });

    // 8. Total Liquidity (Bank + Cash)
    const totalLiquidity = cashAtBank.add(cashInHand);

    // 9. Latest Exchange Rate (USD to ZWG as quoted by RBZ)
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyCode: "USD",
        toCurrencyCode: "ZWG"
      },
      orderBy: { effectiveDate: "desc" }
    });

    // 10. Organisation Info
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { name: true, baseCurrency: true }
    });

    return {
      cashAtBank: cashAtBank.toNumber(),
      cashInHand: cashInHand.toNumber(),
      totalLiquidity: totalLiquidity.toNumber(),
      feesArrears: feesArrears.toNumber(),
      pendingApprovals,
      topSpending: topSpending.map(s => ({ name: s.name, amount: s.amount.toNumber() })),
      budgetUtilisation,
      studentCount,
      exchangeRate: latestRate ? {
        rate: latestRate.rate.toNumber(),
        effectiveDate: latestRate.effectiveDate,
        lastSync: latestRate.updatedAt
      } : null,
      organisationInfo: org
    };
  }

  static async getAccountantMetrics(organisationId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { organisationId },
      select: { accountId: true }
    });
    const bankAccountIds = bankAccounts.map(ba => ba.accountId);

    const bankBalances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId },
        accountId: { in: bankAccountIds }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const cashAtBank = bankBalances.reduce((acc, b) => {
      const bal = (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0));
      return acc.add(bal);
    }, new Decimal(0));

    const cashAccounts = await prisma.account.findMany({
      where: { organisationId, isCashAccount: true },
      select: { id: true }
    });
    const cashAccountIds = cashAccounts.map(ca => ca.id);

    const cashBalances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId },
        accountId: { in: cashAccountIds }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const cashInHand = cashBalances.reduce((acc, b) => {
      const bal = (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0));
      return acc.add(bal);
    }, new Decimal(0));

    const receivablesAgg = await prisma.aRInvoice.aggregate({
      where: { organisationId, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const receivables = receivablesAgg._sum.balance || new Decimal(0);

    const payablesAgg = await prisma.aPBill.aggregate({
      where: { organisationId, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const payables = payablesAgg._sum.balance || new Decimal(0);

    const pendingApprovals = await prisma.voucher.count({
      where: { organisationId, status: VoucherStatus.SUBMITTED }
    });

    const arInvoicesCount = await prisma.aRInvoice.count({
      where: { organisationId }
    });
    const apBillsCount = await prisma.aPBill.count({
      where: { organisationId }
    });

    const incomeExpenseTrend = await prisma.$queryRaw
      `SELECT date_trunc('month', gh.\"entryDate\")::date AS month,
              COALESCE(SUM(CASE WHEN a.\"type\" = 'REVENUE' THEN (ge.\"creditLc\" - ge.\"debitLc\") ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN a.\"type\" = 'EXPENSE' THEN (ge.\"debitLc\" - ge.\"creditLc\") ELSE 0 END), 0) AS expense
         FROM gl_entries ge
         JOIN gl_headers gh ON gh.id = ge.\"glHeaderId\"
         JOIN accounts a ON a.id = ge.\"accountId\"
        WHERE gh.\"organisationId\" = ${organisationId}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 6;`;

    const trend = (incomeExpenseTrend || []).map((row: any) => ({
      month: row.month,
      income: Number(row.income || 0),
      expense: Number(row.expense || 0),
    })).reverse();

    const totalLiquidity = cashAtBank.add(cashInHand);

    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyCode: "USD",
        toCurrencyCode: "ZWG"
      },
      orderBy: { effectiveDate: "desc" }
    });

    return {
      cashAtBank: cashAtBank.toNumber(),
      cashInHand: cashInHand.toNumber(),
      totalLiquidity: totalLiquidity.toNumber(),
      receivables: receivables.toNumber(),
      payables: payables.toNumber(),
      pendingApprovals,
      arInvoicesCount,
      apBillsCount,
      incomeExpenseTrend: trend,
      exchangeRate: latestRate ? {
        rate: latestRate.rate.toNumber(),
        effectiveDate: latestRate.effectiveDate,
        lastSync: latestRate.updatedAt
      } : null,
    };
  }

  static async getBursarMetrics(organisationId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);

    // Receipts this month
    const receiptsThisMonth = await prisma.aRReceipt.aggregate({
      where: { organisationId, receiptDate: { gte: monthStart } },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Outstanding AR balance
    const arBalance = await prisma.aRInvoice.aggregate({
      where: { organisationId, balance: { gt: 0 } },
      _sum: { balance: true },
      _count: { id: true },
    });

    // Invoices by status
    const invoicesByStatus = await prisma.aRInvoice.groupBy({
      by: ["status"],
      where: { organisationId },
      _count: { id: true },
    });

    // Recent receipts
    const recentReceipts = await prisma.aRReceipt.findMany({
      where: { organisationId },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Monthly receipts trend (last 6 months)
    const months: { month: string; receipts: number; invoiced: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [rec, inv] = await Promise.all([
        prisma.aRReceipt.aggregate({ where: { organisationId, receiptDate: { gte: d, lt: end } }, _sum: { amount: true } }),
        prisma.aRInvoice.aggregate({ where: { organisationId, invoiceDate: { gte: d, lt: end } }, _sum: { totalAmount: true } }),
      ]);
      months.push({ month: d.toISOString(), receipts: Number(rec._sum.amount || 0), invoiced: Number(inv._sum.totalAmount || 0) });
    }

    return {
      receiptsThisMonth: Number(receiptsThisMonth._sum.amount || 0),
      receiptsCountThisMonth: receiptsThisMonth._count.id,
      outstandingBalance: Number(arBalance._sum.balance || 0),
      outstandingCount: arBalance._count.id,
      invoicesByStatus: invoicesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      recentReceipts: recentReceipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        student: r.student ? `${r.student.firstName} ${r.student.lastName}` : "Unknown",
        admissionNumber: r.student?.admissionNumber || "-",
        amount: Number(r.amount),
        date: r.receiptDate,
        status: r.status,
      })),
      monthlyTrend: months,
    };
  }

  static async getClerkMetrics(organisationId: string) {
    const now = new Date();

    // Pending approvals
    const pendingApprovals = await prisma.approvalTask.count({
      where: { organisationId, status: "PENDING" },
    });

    // Recent vouchers
    const recentVouchers = await prisma.voucher.findMany({
      where: { organisationId },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Voucher counts by status
    const vouchersByStatus = await prisma.voucher.groupBy({
      by: ["status"],
      where: { organisationId },
      _count: { id: true },
    });

    // Students count
    const studentsCount = await prisma.student.count({ where: { organisationId } });

    // Suppliers count
    const suppliersCount = await prisma.supplier.count({ where: { organisationId } });

    return {
      pendingApprovals,
      studentsCount,
      suppliersCount,
      vouchersByStatus: vouchersByStatus.map((v) => ({ status: v.status, count: v._count.id })),
      recentVouchers: recentVouchers.map((v) => ({
        id: v.id,
        reference: v.reference,
        description: v.description,
        status: v.status,
        date: v.voucherDate,
        createdBy: v.createdBy ? `${v.createdBy.firstName} ${v.createdBy.lastName}` : "Unknown",
      })),
    };
  }

  static async getAuditorMetrics(organisationId: string) {
    const now = new Date();
    
    // 1. Trial Balance Summary (Total Debits/Credits)
    const tb = await ReportService.getTrialBalance(organisationId, now);
    
    // 2. Exception Report Summary
    const exceptions = await ExceptionReportService.getSummary(organisationId);
    
    // 3. Recent Audit Log Highlights
    const auditLogs = await prisma.auditLog.findMany({
      where: { organisationId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    return {
      trialBalance: {
        totalDebits: tb.totals.debit.toNumber(),
        totalCredits: tb.totals.credit.toNumber(),
        isBalanced: tb.totals.debit.equals(tb.totals.credit)
      },
      exceptions,
      recentAuditLogs: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        user: `${log.user.firstName} ${log.user.lastName}`,
        date: log.createdAt,
        entityType: log.entityType
      }))
    };
  }
}
