import prisma from "@/lib/db";
import type { CreateFiscalPeriodInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

export class FiscalPeriodService {
  static async create(data: CreateFiscalPeriodInput, actorId: string) {
    const period = await prisma.fiscalPeriod.create({
      data: {
        organisationId: data.organisationId,
        year: data.year,
        period: data.period,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: "OPEN",
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "FiscalPeriod",
      entityId: period.id,
      newValues: period,
    });

    return period;
  }

  static async findById(id: string) {
    return prisma.fiscalPeriod.findUnique({
      where: { id },
    });
  }

  static async listByOrganisation(organisationId: string, options?: {
    year?: number;
    status?: string;
  }) {
    const where: Record<string, unknown> = { organisationId };
    
    if (options?.year) where.year = options.year;
    if (options?.status) where.status = options.status;

    return prisma.fiscalPeriod.findMany({
      where,
      orderBy: [{ year: "desc" }, { period: "desc" }],
    });
  }

  static async getCurrentPeriod(organisationId: string) {
    const now = new Date();
    
    return prisma.fiscalPeriod.findFirst({
      where: {
        organisationId,
        status: "OPEN",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  static async close(id: string, actorId: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status !== "OPEN") throw new Error("Period is not open");

    const unpostedVouchers = await prisma.voucher.count({
      where: {
        fiscalPeriodId: id,
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
      },
    });

    if (unpostedVouchers > 0) {
      throw new Error(`Cannot close period: ${unpostedVouchers} unposted voucher(s) exist`);
    }

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "CLOSE",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: "OPEN" },
      newValues: { status: "CLOSED" },
    });

    return updated;
  }

  static async lock(id: string, actorId: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status !== "CLOSED") throw new Error("Period must be closed before locking");

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
        lockedBy: actorId,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "LOCK",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: "CLOSED" },
      newValues: { status: "LOCKED" },
    });

    return updated;
  }

  static async reopen(id: string, actorId: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status === "LOCKED") throw new Error("Locked periods cannot be reopened");
    if (period.status !== "CLOSED") throw new Error("Only closed periods can be reopened");

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: { status: "OPEN" },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "REOPEN",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: "CLOSED" },
      newValues: { status: "OPEN" },
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
        status: "OPEN" as const,
      });
    }

    const created = await prisma.fiscalPeriod.createMany({
      data: periods,
      skipDuplicates: true,
    });

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "GENERATE_PERIODS",
      entityType: "FiscalPeriod",
      entityId: `${organisationId}-${year}`,
      newValues: { year, periodsCreated: created.count },
    });

    return prisma.fiscalPeriod.findMany({
      where: { organisationId, year },
      orderBy: { period: "asc" },
    });
  }
}
