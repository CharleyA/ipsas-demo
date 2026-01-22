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

  /**
   * Resolves a currency-specific sub-account for a given parent account code.
   * e.g. If parentCode is 1121 and currency is USD, it looks for 1121.USD.
   * If not found, it creates the sub-account using the parent as a template.
   */
  static async resolveAccountByCurrency(
    organisationId: string,
    parentCode: string,
    currencyCode: string
  ) {
    const currencySuffix = currencyCode.toUpperCase();
    const subAccountCode = `${parentCode}.${currencySuffix}`;

    // Try finding the sub-account first
    const subAccount = await prisma.account.findUnique({
      where: {
        organisationId_code: {
          organisationId,
          code: subAccountCode,
        },
      },
    });

    if (subAccount) return subAccount;

    // Sub-account not found, get parent to use as template
    const parentAccount = await prisma.account.findUnique({
      where: {
        organisationId_code: {
          organisationId,
          code: parentCode,
        },
      },
    });

    if (!parentAccount) {
      throw new Error(`Parent account ${parentCode} not found for organisation ${organisationId}`);
    }

    // Create the sub-account
    try {
      const newAccount = await prisma.account.create({
        data: {
          organisationId,
          code: subAccountCode,
          name: `${parentAccount.name} - ${currencySuffix}`,
          type: parentAccount.type,
          parentId: parentAccount.id,
          description: `System generated currency account for ${currencySuffix}`,
          isSystemAccount: true,
        },
      });
      return newAccount;
    } catch (error: any) {
      // In case of race condition where another request created it simultaneously
      if (error.code === 'P2002') {
        return prisma.account.findUnique({
          where: {
            organisationId_code: {
              organisationId,
              code: subAccountCode,
            },
          },
        }) as any;
      }
      throw error;
    }
  }

  /**
   * Sanitises ledger entries by moving them from parent accounts to currency-specific sub-accounts.
   * e.g. Moves USD transactions from 1121 to 1121.USD.
   */
  static async sanitizeCurrencyAccounts(organisationId: string, actorId: string) {
    const parentCodesToSanitize = ["1121", "4210", "2111"];
    
    const results = {
      voucherLinesFixed: 0,
      glEntriesFixed: 0,
      accountsCreated: 0
    };

    // 1. Process VoucherLines
    const voucherLines = await prisma.voucherLine.findMany({
      where: {
        voucher: { organisationId },
        account: {
          code: { in: parentCodesToSanitize }
        }
      },
      include: {
        account: true,
        voucher: true
      }
    });

    for (const line of voucherLines) {
      const correctAccount = await this.resolveAccountByCurrency(
        organisationId,
        line.account.code,
        line.currencyCode
      );

      if (correctAccount.id !== line.accountId) {
        await prisma.voucherLine.update({
          where: { id: line.id },
          data: { accountId: correctAccount.id }
        });
        results.voucherLinesFixed++;
      }
    }

    // 2. Process GLEntries
    const glEntries = await prisma.gLEntry.findMany({
      where: {
        glHeader: { organisationId },
        account: {
          code: { in: parentCodesToSanitize }
        }
      },
      include: {
        account: true,
        glHeader: true
      }
    });

    for (const entry of glEntries) {
      const correctAccount = await this.resolveAccountByCurrency(
        organisationId,
        entry.account.code,
        entry.currencyCode
      );

      if (correctAccount.id !== entry.accountId) {
        await prisma.gLEntry.update({
          where: { id: entry.id },
          data: { accountId: correctAccount.id }
        });
        results.glEntriesFixed++;
      }
    }

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "SANITIZE_ACCOUNTS",
      entityType: "Account",
      entityId: "bulk",
      newValues: results
    });

    return results;
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
      
      // Multi-currency sub-accounts for Fees Receivable
      { code: "1121.USD", name: "Fees Receivable - USD", type: "ASSET" as const, parentCode: "1121" },
      { code: "1121.ZWG", name: "Fees Receivable - ZWG", type: "ASSET" as const, parentCode: "1121" },

      { code: "1200", name: "Non-Current Assets", type: "ASSET" as const, parentCode: "1000" },
      { code: "1210", name: "Property, Plant and Equipment", type: "ASSET" as const, parentCode: "1200" },
      { code: "1211", name: "Buildings", type: "ASSET" as const, parentCode: "1210" },
      { code: "1212", name: "Furniture and Equipment", type: "ASSET" as const, parentCode: "1210" },

      // Liabilities (2000-2999)
      { code: "2000", name: "LIABILITIES", type: "LIABILITY" as const, parentCode: null as string | null },
      { code: "2100", name: "Current Liabilities", type: "LIABILITY" as const, parentCode: "2000" },
      { code: "2110", name: "Payables from Exchange Transactions", type: "LIABILITY" as const, parentCode: "2100" },
      { code: "2111", name: "Trade Payables", type: "LIABILITY" as const, parentCode: "2110" },
      
      // Multi-currency sub-accounts for Trade Payables
      { code: "2111.USD", name: "Trade Payables - USD", type: "LIABILITY" as const, parentCode: "2111" },
      { code: "2111.ZWG", name: "Trade Payables - ZWG", type: "LIABILITY" as const, parentCode: "2111" },

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
      
      // Multi-currency sub-accounts for Fees Revenue
      { code: "4210.USD", name: "Rendering of Services (Fees) - USD", type: "REVENUE" as const, parentCode: "4210" },
      { code: "4210.ZWG", name: "Rendering of Services (Fees) - ZWG", type: "REVENUE" as const, parentCode: "4210" },

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
