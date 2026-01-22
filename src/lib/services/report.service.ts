import prisma from "@/lib/db";
import { Prisma, ReportType, AccountType } from "@prisma/client";
import { subDays, startOfDay, endOfDay } from "date-fns";

const { Decimal } = Prisma;

export class ReportService {
  static async getTrialBalance(organisationId: string, endDate: Date, filters: { fundId?: string; costCentreId?: string } = {}) {
    const accounts = await prisma.account.findMany({
      where: { organisationId },
      orderBy: { code: "asc" },
    });

    const where: any = {
      glHeader: {
        organisationId,
        entryDate: { lte: endDate },
      },
    };

    if (filters.fundId) where.fundId = filters.fundId;
    if (filters.costCentreId) where.costCentreId = filters.costCentreId;

    const balances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where,
      _sum: {
        debitLc: true,
        creditLc: true,
      },
    });

    const balanceMap = new Map(
      balances.map((b) => [
        b.accountId,
        {
          debit: b._sum.debitLc || new Decimal(0),
          credit: b._sum.creditLc || new Decimal(0),
        },
      ])
    );

    const rows = accounts.map((acc) => {
      const bal = balanceMap.get(acc.id) || {
        debit: new Decimal(0),
        credit: new Decimal(0),
      };
      
      const net = bal.debit.minus(bal.credit);
      
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: bal.debit,
        credit: bal.credit,
        balance: net,
      };
    });

    return {
      asOf: endDate,
      rows,
      totals: {
        debit: rows.reduce((acc, r) => acc.add(r.debit), new Decimal(0)),
        credit: rows.reduce((acc, r) => acc.add(r.credit), new Decimal(0)),
      },
    };
  }

  static async getGeneralLedger(organisationId: string, accountId: string, startDate: Date, endDate: Date, filters: { voucherId?: string } = {}) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Account not found");

    const isUsdAccount = account.code.endsWith(".USD");

    const openingBalAgg = await prisma.gLEntry.aggregate({
      where: {
        accountId,
        glHeader: {
          organisationId,
          entryDate: { lt: startDate },
        },
      },
      _sum: {
        debitLc: true,
        creditLc: true,
        debitFc: true,
        creditFc: true,
      },
    });

    const openingBalance = isUsdAccount 
      ? (openingBalAgg._sum.debitFc || new Decimal(0)).minus(openingBalAgg._sum.creditFc || new Decimal(0))
      : (openingBalAgg._sum.debitLc || new Decimal(0)).minus(openingBalAgg._sum.creditLc || new Decimal(0));

    const entries = await prisma.gLEntry.findMany({
      where: {
        accountId,
        glHeader: {
          organisationId,
          entryDate: { gte: startDate, lte: endDate },
          ...(filters.voucherId ? { voucherId: filters.voucherId } : {}),
        },
      },
      include: {
        glHeader: {
          include: { voucher: true },
        },
      },
      orderBy: { glHeader: { entryDate: "asc" } },
    });

    let runningBalance = openingBalance;
    const rows = entries.map((entry) => {
      const dr = (isUsdAccount ? entry.debitFc : entry.debitLc) || new Decimal(0);
      const cr = (isUsdAccount ? entry.creditFc : entry.creditLc) || new Decimal(0);
      runningBalance = runningBalance.add(dr).minus(cr);

        return {
          id: entry.id,
          date: entry.glHeader.entryDate,
          entryNumber: entry.glHeader.entryNumber,
          voucherId: entry.glHeader.voucher?.id,
          voucherNumber: entry.glHeader.voucher?.number,
          description: entry.description || entry.glHeader.description,
          debit: dr,
          credit: cr,
          balance: runningBalance,
          currency: isUsdAccount ? "USD" : "ZWG",
        };
    });

    const totalDebits = rows.reduce((acc, r) => acc.add(r.debit), new Decimal(0));
    const totalCredits = rows.reduce((acc, r) => acc.add(r.credit), new Decimal(0));
    const netMovement = runningBalance.minus(openingBalance);

    // Group for Daily Activity Chart
    const dailyMap = new Map<string, { date: string, debits: number, credits: number }>();
    rows.forEach(r => {
      const d = r.date.toISOString().split("T")[0];
      const existing = dailyMap.get(d) || { date: d, debits: 0, credits: 0 };
      existing.debits += r.debit.toNumber();
      existing.credits += r.credit.toNumber();
      dailyMap.set(d, existing);
    });

    // Balance Evolution
    const evolutionMap = new Map<string, number>();
    rows.forEach(r => {
      const d = r.date.toISOString().split("T")[0];
      evolutionMap.set(d, r.balance.toNumber());
    });

    return {
      account,
      startDate,
      endDate,
      openingBalance,
      entries: rows,
      closingBalance: runningBalance,
      summary: {
        totalDebits,
        totalCredits,
        netMovement,
      },
      chartData: {
        dailyActivity: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        balanceEvolution: Array.from(evolutionMap.entries())
          .map(([date, balance]) => ({ date, balance }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    };
  }

  static async getAuditLog(organisationId: string, filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { organisationId };
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getFinancialStatement(organisationId: string, type: ReportType, endDate: Date, startDate?: Date) {
    // 1. Get all statement lines for the report
    const lines = await prisma.statementLine.findMany({
      where: { organisationId, reportType: type },
      include: { 
        accountMaps: {
          include: { account: true }
        }
      },
      orderBy: { order: "asc" },
    });

    // 2. Get balances for all accounts linked to these lines
    const accountIds = lines.flatMap(l => l.accountMaps.map(m => m.accountId));
    
    const balances = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: {
        glHeader: {
          organisationId,
          entryDate: { 
            lte: endDate,
            ...(startDate ? { gte: startDate } : {})
          },
        },
        accountId: { in: accountIds }
      },
      _sum: {
        debitLc: true,
        creditLc: true,
      },
    });

    const balanceMap = new Map(
      balances.map((b) => [
        b.accountId,
        (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0))
      ])
    );

    // 3. Recursive function to build tree and calculate totals
    const buildTree = (parentId: string | null = null): any[] => {
      return lines
        .filter(l => l.parentId === parentId)
        .map(line => {
          const children = buildTree(line.id);
          let amount = new Decimal(0);

          // Sum mapped accounts
          line.accountMaps.forEach(m => {
            amount = amount.add(balanceMap.get(m.accountId) || new Decimal(0));
          });

          // Sum children
          children.forEach(c => {
            amount = amount.add(c.amount);
          });

          // For some reports, we might need to flip signs (e.g. Revenue/Liability)
          // But usually we just keep it as net debit - credit and handle in UI if needed

          return {
            id: line.id,
            code: line.code,
            name: line.name,
            amount,
            children
          };
        });
    };

    return {
      reportType: type,
      asOf: endDate,
      startDate,
      rows: buildTree(null)
    };
  }

  static async getFinancialPosition(organisationId: string, date: Date) {
    return this.getFinancialStatement(organisationId, ReportType.FINANCIAL_POSITION, date);
  }

  static async getFinancialPerformance(organisationId: string, startDate: Date, endDate: Date) {
    return this.getFinancialStatement(organisationId, ReportType.FINANCIAL_PERFORMANCE, endDate, startDate);
  }

  static async getCashflow(organisationId: string, startDate: Date, endDate: Date) {
    return this.getFinancialStatement(organisationId, ReportType.CASH_FLOW, endDate, startDate);
  }

  static async getARAgeing(organisationId: string, date: Date) {
    const invoices = await prisma.aRInvoice.findMany({
      where: {
        organisationId,
        voucher: { status: "POSTED" },
        balance: { gt: 0 },
        createdAt: { lte: date }
      },
      include: { student: true }
    });

    return this.calculateAgeing(invoices, date, "student");
  }

  static async getAPAgeing(organisationId: string, date: Date) {
    const bills = await prisma.aPBill.findMany({
      where: {
        organisationId,
        voucher: { status: "POSTED" },
        balance: { gt: 0 },
        createdAt: { lte: date }
      },
      include: { supplier: true }
    });

    return this.calculateAgeing(bills, date, "supplier");
  }

  private static calculateAgeing(items: any[], date: Date, entityKey: string) {
    const ageingRows: any[] = [];
    const entities = new Map<string, any>();

    items.forEach(item => {
      const entity = item[entityKey];
      if (!entities.has(entity.id)) {
        entities.set(entity.id, {
          id: entity.id,
          name: entity.name || `${entity.firstName} ${entity.lastName}`,
          total: new Decimal(0),
          current: new Decimal(0),
          p30: new Decimal(0),
          p60: new Decimal(0),
          p90: new Decimal(0),
          p120: new Decimal(0),
        });
      }

      const row = entities.get(entity.id);
      const amount = item.balance;
      const days = Math.floor((date.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      row.total = row.total.add(amount);
      if (days <= 30) row.current = row.current.add(amount);
      else if (days <= 60) row.p30 = row.p30.add(amount);
      else if (days <= 90) row.p60 = row.p60.add(amount);
      else if (days <= 120) row.p90 = row.p90.add(amount);
      else row.p120 = row.p120.add(amount);
    });

    return {
      asOf: date,
      rows: Array.from(entities.values()),
      totals: {
        total: items.reduce((acc, i) => acc.add(i.balance), new Decimal(0)),
        current: Array.from(entities.values()).reduce((acc, r) => acc.add(r.current), new Decimal(0)),
        p30: Array.from(entities.values()).reduce((acc, r) => acc.add(r.p30), new Decimal(0)),
        p60: Array.from(entities.values()).reduce((acc, r) => acc.add(r.p60), new Decimal(0)),
        p90: Array.from(entities.values()).reduce((acc, r) => acc.add(r.p90), new Decimal(0)),
        p120: Array.from(entities.values()).reduce((acc, r) => acc.add(r.p120), new Decimal(0)),
      }
    };
  }
}
