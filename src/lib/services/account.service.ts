import prisma from "@/lib/db";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class AccountService {
  static async create(data: CreateAccountInput, actorId: string) {
    const account = await prisma.account.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        description: data.description,
        isSystemAccount: data.isSystemAccount ?? false,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Account",
      entityId: account.id,
      newValues: account,
    });

    return account;
  }

  static async findById(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  static async update(id: string, data: UpdateAccountInput, actorId: string) {
    const oldAccount = await prisma.account.findUnique({ where: { id } });
    if (!oldAccount) throw new Error("Account not found");

    const account = await prisma.account.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: actorId,
      organisationId: oldAccount.organisationId,
      action: "UPDATE",
      entityType: "Account",
      entityId: id,
      oldValues: oldAccount,
      newValues: account,
    });

    return account;
  }

  static async listByOrganisation(organisationId: string, options?: {
    type?: any;
    isActive?: boolean;
    parentId?: string | null;
  }) {
    const where: any = { organisationId };

    if (options?.type) where.type = options.type;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.parentId !== undefined) where.parentId = options.parentId;

    return prisma.account.findMany({
      where,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: "asc" },
    });
  }

  static async getChartOfAccounts(organisationId: string) {
    const accounts = await prisma.account.findMany({
      where: { organisationId, isActive: true },
      orderBy: { code: "asc" },
    });

    const buildTree = (parentId: string | null): any[] => {
      return accounts
        .filter(a => a.parentId === parentId)
        .map(a => ({
          ...a,
          children: buildTree(a.id),
        }));
    };

    return buildTree(null);
  }

  static async getAccountBalance(accountId: string, asOfDate?: Date) {
    const dateFilter = asOfDate ? { glHeader: { entryDate: { lte: asOfDate } } } : {};

    const result = await prisma.gLEntry.aggregate({
      where: {
        accountId,
        ...dateFilter,
      },
      _sum: {
        debitLc: true,
        creditLc: true,
      },
    });

    const debitTotal = Number(result._sum.debitLc ?? 0);
    const creditTotal = Number(result._sum.creditLc ?? 0);

    return {
      debitTotal,
      creditTotal,
      balance: debitTotal - creditTotal,
    };
  }

  static async getTrialBalance(organisationId: string, asOfDate?: Date) {
    const accounts = await prisma.account.findMany({
      where: { organisationId, isActive: true },
      orderBy: { code: "asc" },
    });

    const balances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.getAccountBalance(account.id, asOfDate);
        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          ...balance,
        };
      })
    );

    return balances.filter(b => b.debitTotal !== 0 || b.creditTotal !== 0);
  }

  static async getFxGainLossAccount(organisationId: string) {
    return prisma.account.findFirst({
      where: { organisationId, isFxGainLoss: true, isActive: true },
    });
  }

  static async seedIPSAS(organisationId: string, actorId: string) {
    const ipsasAccounts = [
      // Assets (1000-1999)
      { code: "1000", name: "ASSETS", type: "ASSET" as const, parentCode: null as string | null },
      { code: "1100", name: "Current Assets", type: "ASSET" as const, parentCode: "1000" },
      { code: "1110", name: "Cash and Cash Equivalents", type: "ASSET" as const, parentCode: "1100" },
      { code: "1111", name: "Petty Cash", type: "ASSET" as const, parentCode: "1110" },
      { code: "1112", name: "Main Bank Account", type: "ASSET" as const, parentCode: "1110" },
      { code: "1120", name: "Receivables from Non-Exchange Transactions", type: "ASSET" as const, parentCode: "1100" },
      { code: "1121", name: "Fees Receivable", type: "ASSET" as const, parentCode: "1120" },
      { code: "1200", name: "Non-Current Assets", type: "ASSET" as const, parentCode: "1000" },
      { code: "1210", name: "Property, Plant and Equipment", type: "ASSET" as const, parentCode: "1200" },
      { code: "1211", name: "Buildings", type: "ASSET" as const, parentCode: "1210" },
      { code: "1212", name: "Furniture and Equipment", type: "ASSET" as const, parentCode: "1210" },

      // Liabilities (2000-2999)
      { code: "2000", name: "LIABILITIES", type: "LIABILITY" as const, parentCode: null as string | null },
      { code: "2100", name: "Current Liabilities", type: "LIABILITY" as const, parentCode: "2000" },
      { code: "2110", name: "Payables from Exchange Transactions", type: "LIABILITY" as const, parentCode: "2100" },
      { code: "2111", name: "Trade Payables", type: "LIABILITY" as const, parentCode: "2110" },
      { code: "2120", name: "Taxes and Levies Payable", type: "LIABILITY" as const, parentCode: "2100" },

      // Net Assets/Equity (3000-3999)
      { code: "3000", name: "NET ASSETS / EQUITY", type: "NET_ASSETS_EQUITY" as const, parentCode: null as string | null },
      { code: "3100", name: "Accumulated Surpluses / (Deficits)", type: "NET_ASSETS_EQUITY" as const, parentCode: "3000" },
      { code: "3200", name: "Reserves", type: "NET_ASSETS_EQUITY" as const, parentCode: "3000" },

      // Revenue (4000-4999)
      { code: "4000", name: "REVENUE", type: "REVENUE" as const, parentCode: null as string | null },
      { code: "4100", name: "Revenue from Non-Exchange Transactions", type: "REVENUE" as const, parentCode: "4000" },
      { code: "4110", name: "Taxes / Levies", type: "REVENUE" as const, parentCode: "4100" },
      { code: "4120", name: "Transfers from Other Government Entities", type: "REVENUE" as const, parentCode: "4100" },
      { code: "4200", name: "Revenue from Exchange Transactions", type: "REVENUE" as const, parentCode: "4000" },
      { code: "4210", name: "Rendering of Services (Fees)", type: "REVENUE" as const, parentCode: "4200" },
      { code: "4220", name: "Sale of Goods", type: "REVENUE" as const, parentCode: "4200" },

      // Expenses (5000-5999)
      { code: "5000", name: "EXPENSES", type: "EXPENSE" as const, parentCode: null as string | null },
      { code: "5100", name: "Wages, Salaries and Employee Benefits", type: "EXPENSE" as const, parentCode: "5000" },
      { code: "5200", name: "Supplies and Consumables Used", type: "EXPENSE" as const, parentCode: "5000" },
      { code: "5300", name: "Depreciation and Amortization", type: "EXPENSE" as const, parentCode: "5000" },
      { code: "5400", name: "Other Expenses", type: "EXPENSE" as const, parentCode: "5000" },
    ];

    const results = [];
    const codeToId: Record<string, string> = {};

    // First pass: create accounts without parents
    for (const item of ipsasAccounts) {
      const existing = await prisma.account.findUnique({
        where: { organisationId_code: { organisationId, code: item.code } }
      });

      if (!existing) {
        const account = await prisma.account.create({
          data: {
            organisationId,
            code: item.code,
            name: item.name,
            type: item.type,
          }
        });
        codeToId[item.code] = account.id;
        results.push(account);
      } else {
        codeToId[item.code] = existing.id;
      }
    }

    // Second pass: set parentIds
    for (const item of ipsasAccounts) {
      if (item.parentCode) {
        await prisma.account.update({
          where: { organisationId_code: { organisationId, code: item.code } },
          data: { parentId: codeToId[item.parentCode] }
        });
      }
    }

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "SEED_IPSAS_COA",
      entityType: "Account",
      entityId: "bulk",
      newValues: { count: results.length }
    });

    return results;
  }
}
