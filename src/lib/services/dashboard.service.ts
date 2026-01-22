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

    // 9. Latest Exchange Rate (ZWG to USD)
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyCode: "ZWG",
        toCurrencyCode: "USD"
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
