import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export class ReportService {
  static async getTrialBalance(organisationId: string, endDate: Date) {
    // 1. Get all accounts
    const accounts = await prisma.account.findMany({
      where: { organisationId },
      orderBy: { code: "asc" },
    });

    // 2. Aggregate GL entries up to endDate
    const balances = await prisma.glEntry.groupBy({
      by: ["accountId"],
      where: {
        header: {
          organisationId,
          entryDate: { lte: endDate },
        },
      },
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

    // 3. Construct TB rows
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

  static async getGeneralLedger(organisationId: string, accountId: string, startDate: Date, endDate: Date) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Account not found");

    // 1. Calculate opening balance
    const openingBalAgg = await prisma.glEntry.aggregate({
      where: {
        accountId,
        header: {
          organisationId,
          entryDate: { lt: startDate },
        },
      },
      _sum: {
        debitLc: true,
        creditLc: true,
      },
    });

    const openingBalance = (openingBalAgg._sum.debitLc || new Decimal(0)).minus(
      openingBalAgg._sum.creditLc || new Decimal(0)
    );

    // 2. Get period entries
    const entries = await prisma.glEntry.findMany({
      where: {
        accountId,
        header: {
          organisationId,
          entryDate: { gte: startDate, lte: endDate },
        },
      },
      include: {
        header: {
          include: { voucher: true },
        },
      },
      orderBy: { header: { entryDate: "asc" } },
    });

    let runningBalance = openingBalance;
    const rows = entries.map((entry) => {
      const dr = entry.debitLc || new Decimal(0);
      const cr = entry.creditLc || new Decimal(0);
      runningBalance = runningBalance.add(dr).minus(cr);

      return {
        id: entry.id,
        date: entry.header.entryDate,
        entryNumber: entry.header.entryNumber,
        voucherNumber: entry.header.voucher?.number,
        description: entry.description || entry.header.description,
        debit: dr,
        credit: cr,
        balance: runningBalance,
      };
    });

    return {
      account,
      startDate,
      endDate,
      openingBalance,
      entries: rows,
      closingBalance: runningBalance,
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
}
