import prisma from "@/lib/db";
import { CreateAccountingPeriodInput } from "@/lib/validations/schemas";
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
  }) {
    const where: any = { organisationId };
    if (options?.year) where.year = options.year;

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
}
