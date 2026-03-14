import prisma from "@/lib/db";
import { FiscalPeriodStatus } from "@prisma/client";
import { CreateAccountingPeriodInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";

const LOCK_OVERRIDE_ROLES = ["ADMIN", "HEADMASTER"];
const REOPEN_ROLES = ["ADMIN", "HEADMASTER"];

export class AccountingPeriodService {
  static async create(data: CreateAccountingPeriodInput, actorId: string) {
    const period = await prisma.fiscalPeriod.create({
      data: {
        organisationId: data.organisationId,
        year: data.year,
        period: data.period,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: FiscalPeriodStatus.OPEN,
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

  static async listByOrganisation(organisationId: string, options?: { year?: number }) {
    const where: any = { organisationId };
    if (options?.year) where.year = options.year;

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
        status: FiscalPeriodStatus.OPEN,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  static async close(id: string, actorId: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status !== FiscalPeriodStatus.OPEN) {
      throw new Error("Only open periods can be closed");
    }

    const unpostedVouchers = await prisma.voucher.count({
      where: {
        periodId: id,
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
      },
    });

    if (unpostedVouchers > 0) {
      throw new Error(`Cannot close period: ${unpostedVouchers} unposted voucher(s) exist`);
    }

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: { status: FiscalPeriodStatus.CLOSED },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "CLOSE_PERIOD",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: FiscalPeriodStatus.OPEN },
      newValues: { status: FiscalPeriodStatus.CLOSED },
    });

    return updated;
  }

  static async lock(id: string, actorId: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status === FiscalPeriodStatus.LOCKED) {
      throw new Error("Period is already locked");
    }

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: {
        status: FiscalPeriodStatus.LOCKED,
        lockedAt: new Date(),
        lockedBy: actorId,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "LOCK_PERIOD",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: period.status },
      newValues: { status: FiscalPeriodStatus.LOCKED, lockedAt: updated.lockedAt },
    });

    return updated;
  }

  static async reopen(id: string, actorId: string, reason: string) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id } });
    if (!period) throw new Error("Fiscal period not found");
    if (period.status === FiscalPeriodStatus.OPEN) {
      throw new Error("Period is already open");
    }

    const userOrg = await prisma.organisationUser.findFirst({
      where: { userId: actorId, organisationId: period.organisationId }
    });

    if (!userOrg || !REOPEN_ROLES.includes(userOrg.role)) {
      throw new Error(`Only ${REOPEN_ROLES.join(", ")} can reopen closed/locked periods`);
    }

    const updated = await prisma.fiscalPeriod.update({
      where: { id },
      data: {
        status: FiscalPeriodStatus.OPEN,
        lockedAt: null,
        lockedBy: null,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: period.organisationId,
      action: "REOPEN_PERIOD",
      entityType: "FiscalPeriod",
      entityId: id,
      oldValues: { status: period.status },
      newValues: { status: FiscalPeriodStatus.OPEN, reason },
    });

    return updated;
  }

  static async canPostToPeriod(periodId: string, actorId: string, override = false): Promise<{ canPost: boolean; reason?: string }> {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id: periodId } });
    if (!period) return { canPost: false, reason: "Period not found" };

    if (period.status === FiscalPeriodStatus.CLOSED) {
      return { canPost: false, reason: "Period is closed" };
    }

    if (period.status === FiscalPeriodStatus.LOCKED) {
      if (!override) {
        return { canPost: false, reason: "Period is locked. Override required." };
      }

      const userOrg = await prisma.organisationUser.findFirst({
        where: { userId: actorId, organisationId: period.organisationId }
      });

      if (!userOrg || !LOCK_OVERRIDE_ROLES.includes(userOrg.role)) {
        return { canPost: false, reason: `Only ${LOCK_OVERRIDE_ROLES.join(", ")} can override locked period` };
      }
    }

    return { canPost: true };
  }
}
