import prisma from "@/lib/db";
import { Prisma, VoucherStatus, AccountType } from "@prisma/client";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { ExceptionReportService } from "./exception-report.service";
import { ReportService } from "./report.service";

const { Decimal } = Prisma;

export class DashboardService {
  static async getHeadmasterMetrics(organisationId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);

    // 1. Cash at bank (Sum of all BANK type accounts)
    const bankBalances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: { organisationId },
        account: { type: AccountType.BANK }
      },
      _sum: { debitLc: true, creditLc: true }
    });

    const cashAtBank = bankBalances.reduce((acc, b) => {
      const bal = (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0));
      return acc.add(bal);
    }, new Decimal(0));

    // 2. Fees Arrears Ageing Summary (Total receivables balance)
    const receivablesAgg = await prisma.aRInvoice.aggregate({
      where: { organisationId, balance: { gt: 0 } },
      _sum: { balance: true }
    });
    const feesArrears = receivablesAgg._sum.balance || new Decimal(0);

    // 3. Approvals Pending
    const pendingApprovals = await prisma.voucher.count({
      where: { organisationId, status: VoucherStatus.SUBMITTED }
    });

    // 4. Top spending categories (Expenses by Account Type / Name)
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

    // 5. Budget Utilisation (Mocked for now since budget model is simple)
    // In a real scenario, we'd compare GL actuals vs Budget lines
    const budgetUtilisation = 65; // Percentage

    return {
      cashAtBank: cashAtBank.toNumber(),
      feesArrears: feesArrears.toNumber(),
      pendingApprovals,
      topSpending: topSpending.map(s => ({ name: s.name, amount: s.amount.toNumber() })),
      budgetUtilisation
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
