import prisma from "@/lib/db";
import type { CreateAccountInput, UpdateAccountInput, CreateAccountCategoryInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class AccountService {
  static async create(data: CreateAccountInput, actorId: string) {
    const account = await prisma.account.create({
      data: {
        organisationId: data.organisationId,
        code: data.code,
        name: data.name,
        type: data.type,
        categoryId: data.categoryId,
        parentId: data.parentId,
        description: data.description,
        isSystemAccount: data.isSystemAccount ?? false,
        isFxGainLoss: data.isFxGainLoss ?? false,
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
        category: true,
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
    type?: string;
    isActive?: boolean;
    parentId?: string | null;
  }) {
    const where: Record<string, unknown> = { organisationId };

    if (options?.type) where.type = options.type;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.parentId !== undefined) where.parentId = options.parentId;

    return prisma.account.findMany({
      where,
      include: {
        category: true,
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: { code: "asc" },
    });
  }

  static async getChartOfAccounts(organisationId: string) {
    const accounts = await prisma.account.findMany({
      where: { organisationId, isActive: true },
      include: { category: true },
      orderBy: { code: "asc" },
    });

    const buildTree = (parentId: string | null): unknown[] => {
      return accounts
        .filter(a => a.parentId === parentId)
        .map(a => ({
          ...a,
          children: buildTree(a.id),
        }));
    };

    return buildTree(null);
  }

  static async createCategory(data: CreateAccountCategoryInput, actorId: string) {
    const category = await prisma.accountCategory.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        order: data.order ?? 0,
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "CREATE",
      entityType: "AccountCategory",
      entityId: category.id,
      newValues: category,
    });

    return category;
  }

  static async listCategories(type?: string) {
    const where = type ? { type: type as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" } : {};
    
    return prisma.accountCategory.findMany({
      where,
      orderBy: { order: "asc" },
    });
  }

  static async getAccountBalance(accountId: string, asOfDate?: Date) {
    const dateFilter = asOfDate ? { entryDate: { lte: asOfDate } } : {};

    const result = await prisma.journalLine.aggregate({
      where: {
        accountId,
        journalEntry: dateFilter,
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
}
