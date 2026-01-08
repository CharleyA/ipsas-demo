import prisma from "@/lib/db";
import type { CreateAccountingPeriodInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class AccountingPeriodService {
  static async create(data: CreateAccountingPeriodInput, actorId: string) {
    const period = await prisma.accountingPeriod.create({
      data: {
        organisationId: data.organisationId,
        year: data.year,
        period: data.period,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isClosed: false,
        isLocked: false,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "AccountingPeriod",
      entityId: period.id,
      newValues: period,
    });

    return period;
  }

  static async findById(id: string) {
    return prisma.accountingPeriod.findUnique({
      where: { id },
    });
  }

  static async listByOrganisation(organisationId: string, options?: {
    year?: number;
    isClosed?: boolean;
    isLocked?: boolean;
  }) {
    const where: Record<string, unknown> = { organisationId };
    
    if (options?.year) where.year = options.year;
    if (options?.isClosed !== undefined) where.isClosed = options.isClosed;
    if (options?.isLocked !== undefined) where.isLocked = options.isLocked;

    return prisma.accountingPeriod.findMany({
      where,
      orderBy: [{ year: "desc" }, { period: "desc" }],
    });
  }

  static async getCurrentPeriod(organisationId: string) {
    const now = new Date();
    
    return prisma.accountingPeriod.findFirst({
      where: {
        organisationId,
        isClosed: false,
        isLocked: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  static async close(id: string, actorId: string) {
    const period = await prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Accounting period not found");
    if (period.isClosed) throw new Error("Period is already closed");

    const unpostedVouchers = await prisma.voucher.count({
      where: {
        periodId: id,
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
      },
    });

    if (unpostedVouchers > 0) {
      throw new Error(`Cannot close period: ${unpostedVouchers} unposted voucher(s) exist`);
    }

    const updated = await prisma.accountingPeriod.update({
      where: { id },
      data: { isClosed: true },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "CLOSE",
      entityType: "AccountingPeriod",
      entityId: id,
      oldValues: { isClosed: false },
      newValues: { isClosed: true },
    });

    return updated;
  }

  static async lock(id: string, actorId: string) {
    const period = await prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Accounting period not found");
    if (!period.isClosed) throw new Error("Period must be closed before locking");
    if (period.isLocked) throw new Error("Period is already locked");

    const updated = await prisma.accountingPeriod.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "LOCK",
      entityType: "AccountingPeriod",
      entityId: id,
      oldValues: { isLocked: false },
      newValues: { isLocked: true },
    });

    return updated;
  }

  static async reopen(id: string, actorId: string) {
    const period = await prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Accounting period not found");
    if (period.isLocked) throw new Error("Locked periods cannot be reopened");
    if (!period.isClosed) throw new Error("Only closed periods can be reopened");

    const updated = await prisma.accountingPeriod.update({
      where: { id },
      data: { isClosed: false },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "REOPEN",
      entityType: "AccountingPeriod",
      entityId: id,
      oldValues: { isClosed: true },
      newValues: { isClosed: false },
    });

    return updated;
  }

  static async generatePeriodsForYear(organisationId: string, year: number, actorId: string) {
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) throw new Error("Organisation not found");

    const periods = [];
    const startMonth = org.fiscalYearStart;

    for (let i = 0; i < 12; i++) {
      const month = ((startMonth - 1 + i) % 12) + 1;
      const periodYear = month >= startMonth ? year : year + 1;
      
      const startDate = new Date(periodYear, month - 1, 1);
      const endDate = new Date(periodYear, month, 0);
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      periods.push({
        organisationId,
        year,
        period: i + 1,
        name: `${monthNames[month - 1]} ${periodYear}`,
        startDate,
        endDate,
        isClosed: false,
        isLocked: false,
      });
    }

    const created = await prisma.accountingPeriod.createMany({
      data: periods,
      skipDuplicates: true,
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "GENERATE_PERIODS",
      entityType: "AccountingPeriod",
      entityId: `${organisationId}-${year}`,
      newValues: { year, periodsCreated: created.count },
    });

    return prisma.accountingPeriod.findMany({
      where: { organisationId, year },
      orderBy: { period: "asc" },
    });
  }
}
