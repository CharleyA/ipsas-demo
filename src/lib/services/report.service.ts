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

  static async getGeneralLedger(
    organisationId: string, 
    accountId: string, 
    startDate: Date, 
    endDate: Date, 
    filters: { voucherId?: string; page?: number; pageSize?: number; reportingCurrency?: string } = {}
  ) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new Error("Account not found");

    const org = await prisma.organisation.findUnique({ where: { id: organisationId } });
    const baseCurrency = org?.baseCurrency || "ZWG";

    // Detect if this is a foreign currency account
    // For now, we use the .USD convention, but we could also check bankAccount or entries
    const isUsdAccount = account.code.endsWith(".USD");
    const accountCurrency = isUsdAccount ? "USD" : baseCurrency;
    
    // The currency we are actually reporting in
    const reportingCurrency = filters.reportingCurrency || accountCurrency;
    
    // Determine which fields to use based on reporting currency
    const useFc = reportingCurrency === "USD";
    const useLc = reportingCurrency === baseCurrency;
    
    // If it's a currency we don't have direct fields for, we'd need conversion
    // But for now, we'll support USD and Base (ZWG)

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

    const openingBalance = useFc 
      ? (openingBalAgg._sum.debitFc || new Decimal(0)).minus(openingBalAgg._sum.creditFc || new Decimal(0))
      : (openingBalAgg._sum.debitLc || new Decimal(0)).minus(openingBalAgg._sum.creditLc || new Decimal(0));

    const baseWhere: Prisma.GLEntryWhereInput = {
      accountId,
      glHeader: {
        organisationId,
        entryDate: { gte: startDate, lte: endDate },
        ...(filters.voucherId ? { voucherId: filters.voucherId } : {}),
      },
    };

    const totalCount = await prisma.gLEntry.count({ where: baseWhere });

    // Fetch entries for the specific page if pagination is provided
    const { page, pageSize } = filters;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize;

    const entries = await prisma.gLEntry.findMany({
      where: baseWhere,
      include: {
        glHeader: {
          include: { voucher: true },
        },
      },
      orderBy: [
        { glHeader: { entryDate: "asc" } },
        { glHeader: { entryNumber: "asc" } },
        { id: "asc" }
      ],
      skip,
      take,
    });

    // To calculate the running balance for paginated results, we need the sum of movements before the current skip
    let runningBalance = openingBalance;
    if (skip && skip > 0) {
      const priorMovements = await prisma.gLEntry.aggregate({
        where: baseWhere,
        _sum: {
          debitLc: true,
          creditLc: true,
          debitFc: true,
          creditFc: true,
        },
        orderBy: [
          { glHeader: { entryDate: "asc" } },
          { glHeader: { entryNumber: "asc" } },
          { id: "asc" }
        ],
        take: skip,
      });

      const priorDr = useFc ? (priorMovements._sum.debitFc || new Decimal(0)) : (priorMovements._sum.debitLc || new Decimal(0));
      const priorCr = useFc ? (priorMovements._sum.creditFc || new Decimal(0)) : (priorMovements._sum.creditLc || new Decimal(0));
      runningBalance = runningBalance.add(priorDr).minus(priorCr);
    }

    const pageOpeningBalance = runningBalance;

    const rows = entries.map((entry) => {
      const dr = (useFc ? entry.debitFc : entry.debitLc) || new Decimal(0);
      const cr = (useFc ? entry.creditFc : entry.creditLc) || new Decimal(0);
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
        currency: reportingCurrency,
      };
    });

    // Summary and charts should ideally be based on ALL data for the period
    const periodAgg = await prisma.gLEntry.aggregate({
      where: baseWhere,
      _sum: {
        debitLc: true,
        creditLc: true,
        debitFc: true,
        creditFc: true,
      },
    });

    const totalDebits = useFc ? (periodAgg._sum.debitFc || new Decimal(0)) : (periodAgg._sum.debitLc || new Decimal(0));
    const totalCredits = useFc ? (periodAgg._sum.creditFc || new Decimal(0)) : (periodAgg._sum.creditLc || new Decimal(0));
    const closingBalance = openingBalance.add(totalDebits).minus(totalCredits);
    const netMovement = totalDebits.minus(totalCredits);

    // Chart data (Daily Activity) - we might need to group by date to keep it efficient
    const dailyMovements = await prisma.gLEntry.groupBy({
      by: ["accountId"],
      where: baseWhere,
      _sum: {
        debitLc: true,
        creditLc: true,
        debitFc: true,
        creditFc: true,
      },
      // Note: Grouping by date in Prisma is tricky without raw query or specific fields
      // For now, if entries are few, we can fetch all and group in JS, but for many, it's better to fetch date-wise aggregates.
      // Since GL can have many entries, let's just fetch simplified data for charts.
    });

    // Refined Chart Data fetching (only if not exporting or if small enough)
    // For now, let's keep the JS grouping but limit to a reasonable number of days or entries
    // Alternatively, let's just return the paginated rows and the overall summary.
    // BUT the user wants charts.
    
    let chartData = { dailyActivity: [] as any[], balanceEvolution: [] as any[] };
    if (!page || totalCount < 1000) {
      // If no page (export) or small count, fetch all for charts
      const allEntries = await prisma.gLEntry.findMany({
        where: baseWhere,
        select: {
          debitLc: true,
          creditLc: true,
          debitFc: true,
          creditFc: true,
          glHeader: { select: { entryDate: true } }
        },
        orderBy: { glHeader: { entryDate: "asc" } }
      });

      const dailyMap = new Map<string, { date: string, debits: number, credits: number }>();
      let evolutionBal = openingBalance;
      const evolution: { date: string, balance: number }[] = [];

        allEntries.forEach(e => {
          const d = e.glHeader.entryDate.toISOString().split("T")[0];
          const dr = useFc ? (e.debitFc || 0) : (e.debitLc || 0);
          const cr = useFc ? (e.creditFc || 0) : (e.creditLc || 0);
          
          const existing = dailyMap.get(d) || { date: d, debits: 0, credits: 0 };

        existing.debits += Number(dr);
        existing.credits += Number(cr);
        dailyMap.set(d, existing);

        evolutionBal = evolutionBal.add(dr).minus(cr);
        evolution.push({ date: d, balance: evolutionBal.toNumber() });
      });

      chartData = {
        dailyActivity: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        balanceEvolution: evolution,
      };
    }

    return {
      account,
      startDate,
      endDate,
      openingBalance,
      pageOpeningBalance,
      entries: rows,
      closingBalance,
      totalCount,
      page: page || 1,
      pageSize: pageSize || totalCount,
      totalPages: pageSize ? Math.ceil(totalCount / pageSize) : 1,
      summary: {
        totalDebits,
        totalCredits,
        netMovement,
      },
      reportingCurrency,
      accountCurrency,
      chartData
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

  static async getFinancialStatement(organisationId: string, type: ReportType, endDate: Date, startDate?: Date, options: { reportingCurrency?: string } = {}) {
    const org = await prisma.organisation.findUnique({ where: { id: organisationId } });
    const baseCurrency = org?.baseCurrency || "ZWG";
    const reportingCurrency = options.reportingCurrency || baseCurrency;
    const useFc = reportingCurrency === "USD";

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
        debitFc: true,
        creditFc: true,
      },
    });

    const balanceMap = new Map(
      balances.map((b) => [
        b.accountId,
        useFc 
          ? (b._sum.debitFc || new Decimal(0)).minus(b._sum.creditFc || new Decimal(0))
          : (b._sum.debitLc || new Decimal(0)).minus(b._sum.creditLc || new Decimal(0))
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

          return {
            id: line.id,
            code: line.code,
            name: line.name,
            amount,
            children
          };
        });
    };

    const rows = buildTree(null);

    // Calculate Summary Totals for Info Cards
    let summary: any = {};
    let chartData: any = {};

    if (type === ReportType.FINANCIAL_POSITION) {
      const assets = rows.find(r => r.name.toLowerCase().includes("asset"))?.amount || new Decimal(0);
      const liabilities = rows.find(r => r.name.toLowerCase().includes("liabilit"))?.amount || new Decimal(0);
      const netAssets = rows.find(r => r.name.toLowerCase().includes("net asset") || r.name.toLowerCase().includes("equity"))?.amount || assets.add(liabilities);

      summary = {
        totalAssets: assets.abs(),
        totalLiabilities: liabilities.abs(),
        netAssets: netAssets.abs(),
        equity: netAssets.abs(),
      };

      chartData = {
        composition: rows.map(r => ({
          name: r.name,
          value: Number(r.amount.abs())
        })).filter(r => r.value > 0)
      };
    } else if (type === ReportType.FINANCIAL_PERFORMANCE) {
      const revenue = rows.find(r => r.name.toLowerCase().includes("revenue"))?.amount || new Decimal(0);
      const expenses = rows.find(r => r.name.toLowerCase().includes("expense"))?.amount || new Decimal(0);
      
      // Revenue is credit-normal (negative in our Debit-Credit calc), Expense is debit-normal (positive)
      // Surplus = Revenue (Credit) - Expense (Debit)
      // In our Debit-Credit: 
      // Total Revenue = |Revenue|
      // Total Expenses = Expenses
      // Surplus = |Revenue| - Expenses
      
      const totalRevenue = revenue.abs();
      const totalExpenses = expenses.abs();
      const surplus = totalRevenue.minus(totalExpenses);

      summary = {
        totalRevenue,
        totalExpenses,
        surplus,
        margin: totalRevenue.gt(0) ? surplus.div(totalRevenue).mul(100) : new Decimal(0)
      };

        chartData = {
          revenueVsExpense: [
            { name: "Revenue", value: Number(totalRevenue) },
            { name: "Expenses", value: Number(totalExpenses) }
          ],
          expenseComposition: rows.find(r => r.name.toLowerCase().includes("expense"))?.children.map((c: any) => ({
            name: c.name,
            value: Number(c.amount.abs())
          })).filter((c: any) => c.value > 0) || []
        };
      } else if (type === ReportType.CASH_FLOW) {
        const operating = rows.find(r => r.code === "CF-100")?.amount || new Decimal(0);
        const investing = rows.find(r => r.code === "CF-200")?.amount || new Decimal(0);
        const financing = rows.find(r => r.code === "CF-300")?.amount || new Decimal(0);
        
        const netCashChange = operating.add(investing).add(financing);

        summary = {
          operatingCashFlow: operating,
          investingCashFlow: investing,
          financingCashFlow: financing,
          netCashChange,
        };

        chartData = {
          cashFlowBreakdown: [
            { name: "Operating", value: Number(operating) },
            { name: "Investing", value: Number(investing) },
            { name: "Financing", value: Number(financing) }
          ],
          operatingComposition: rows.find(r => r.code === "CF-100")?.children.map((c: any) => ({
            name: c.name,
            value: Number(c.amount.abs())
          })).filter((c: any) => c.value > 0) || []
        };
      }


    return {
      reportType: type,
      asOf: endDate,
      startDate,
      rows,
      summary,
      chartData,
      reportingCurrency,
    };
  }

  static async getFinancialPosition(organisationId: string, date: Date, options: { reportingCurrency?: string } = {}) {
    return this.getFinancialStatement(organisationId, ReportType.FINANCIAL_POSITION, date, undefined, options);
  }

  static async getFinancialPerformance(organisationId: string, startDate: Date, endDate: Date, options: { reportingCurrency?: string } = {}) {
    return this.getFinancialStatement(organisationId, ReportType.FINANCIAL_PERFORMANCE, endDate, startDate, options);
  }

  static async getCashflow(organisationId: string, startDate: Date, endDate: Date, options: { reportingCurrency?: string } = {}) {
    return this.getFinancialStatement(organisationId, ReportType.CASH_FLOW, endDate, startDate, options);
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
