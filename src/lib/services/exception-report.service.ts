import prisma from "@/lib/db";
import { VoucherType, VoucherStatus } from "@prisma/client";

export interface ExceptionSummary {
  backdatedPostings: number;
  reopenedPeriods: number;
  missingAttachments: number;
  manualJournals: number;
  periodOverrides: number;
  reversals: number;
}

export interface BackdatedPostingException {
  voucherId: string;
  voucherNumber: string;
  voucherDate: Date;
  postDate: Date;
  daysDiff: number;
  userId: string;
  userName: string;
}

export interface ReopenedPeriodException {
  periodId: string;
  periodName: string;
  reopenDate: Date;
  userId: string;
  userName: string;
  reason: string;
}

export interface MissingAttachmentException {
  voucherId: string;
  voucherNumber: string;
  voucherType: string;
  status: string;
  createdAt: Date;
}

export interface ManualJournalSummary {
  voucherId: string;
  voucherNumber: string;
  date: Date;
  description: string;
  totalAmount: number;
  createdBy: string;
  status: string;
}

export interface PeriodOverrideException {
  periodId: string;
  periodName: string;
  overrideDate: Date;
  userId: string;
  userName: string;
}

export interface ReversalException {
  originalVoucherId: string;
  originalVoucherNumber: string;
  reversalVoucherId: string;
  reversalVoucherNumber: string;
  reversalDate: Date;
  userId: string;
  userName: string;
  reason: string;
}

export class ExceptionReportService {
  static async getSummary(organisationId: string, startDate?: Date, endDate?: Date): Promise<ExceptionSummary> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      backdatedPostings,
      reopenedPeriods,
      missingAttachments,
      manualJournals,
      periodOverrides,
      reversals,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: {
          organisationId,
          action: "BACKDATED_POSTING_ATTEMPT",
          ...dateFilter,
        },
      }),
      prisma.auditLog.count({
        where: {
          organisationId,
          action: "REOPEN_PERIOD",
          ...dateFilter,
        },
      }),
      prisma.voucher.count({
        where: {
          organisationId,
          status: VoucherStatus.POSTED,
          attachments: { none: {} },
          ...dateFilter,
        },
      }),
      prisma.voucher.count({
        where: {
          organisationId,
          type: VoucherType.JOURNAL,
          status: VoucherStatus.POSTED,
          ...dateFilter,
        },
      }),
      prisma.auditLog.count({
        where: {
          organisationId,
          action: "PERIOD_LOCK_OVERRIDE",
          ...dateFilter,
        },
      }),
      prisma.voucher.count({
        where: {
          organisationId,
          status: VoucherStatus.REVERSED,
          ...dateFilter,
        },
      }),
    ]);

    return {
      backdatedPostings,
      reopenedPeriods,
      missingAttachments,
      manualJournals,
      periodOverrides,
      reversals,
    };
  }

  static async getBackdatedPostings(organisationId: string, startDate?: Date, endDate?: Date): Promise<BackdatedPostingException[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId,
        action: "BACKDATED_POSTING_ATTEMPT",
        ...dateFilter,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return logs.map(log => {
      const newValues = log.newValues as any;
      const voucherDate = new Date(newValues?.voucherDate);
      const postDate = new Date(newValues?.postDate || log.createdAt);
      const daysDiff = Math.floor((postDate.getTime() - voucherDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        voucherId: log.entityId,
        voucherNumber: newValues?.voucherNumber || log.entityId,
        voucherDate,
        postDate,
        daysDiff,
        userId: log.userId,
        userName: `${log.user.firstName} ${log.user.lastName}`,
      };
    });
  }

  static async getReopenedPeriods(organisationId: string, startDate?: Date, endDate?: Date): Promise<ReopenedPeriodException[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId,
        action: "REOPEN_PERIOD",
        ...dateFilter,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return logs.map(log => {
      const newValues = log.newValues as any;
      return {
        periodId: log.entityId,
        periodName: newValues?.periodName || log.entityId,
        reopenDate: log.createdAt,
        userId: log.userId,
        userName: `${log.user.firstName} ${log.user.lastName}`,
        reason: newValues?.reason || "No reason provided",
      };
    });
  }

  static async getMissingAttachments(organisationId: string, startDate?: Date, endDate?: Date): Promise<MissingAttachmentException[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const vouchers = await prisma.voucher.findMany({
      where: {
        organisationId,
        status: VoucherStatus.POSTED,
        attachments: { none: {} },
        ...dateFilter,
      },
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return vouchers.map(v => ({
      voucherId: v.id,
      voucherNumber: v.number,
      voucherType: v.type,
      status: v.status,
      createdAt: v.createdAt,
    }));
  }

  static async getManualJournals(organisationId: string, startDate?: Date, endDate?: Date): Promise<ManualJournalSummary[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const vouchers = await prisma.voucher.findMany({
      where: {
        organisationId,
        type: VoucherType.JOURNAL,
        status: VoucherStatus.POSTED,
        ...dateFilter,
      },
      include: {
        lines: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
    });

    return vouchers.map(v => {
      const totalAmount = v.lines.reduce((sum, line) => {
        const debit = line.debitLc ? parseFloat(line.debitLc.toString()) : 0;
        return sum + debit;
      }, 0);

      return {
        voucherId: v.id,
        voucherNumber: v.number,
        date: v.date,
        description: v.description,
        totalAmount,
        createdBy: `${v.createdBy.firstName} ${v.createdBy.lastName}`,
        status: v.status,
      };
    });
  }

  static async getPeriodOverrides(organisationId: string, startDate?: Date, endDate?: Date): Promise<PeriodOverrideException[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId,
        action: "PERIOD_LOCK_OVERRIDE",
        ...dateFilter,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return logs.map(log => {
      const newValues = log.newValues as any;
      return {
        periodId: log.entityId,
        periodName: newValues?.periodName || log.entityId,
        overrideDate: log.createdAt,
        userId: log.userId,
        userName: `${log.user.firstName} ${log.user.lastName}`,
      };
    });
  }

  static async getReversals(organisationId: string, startDate?: Date, endDate?: Date): Promise<ReversalException[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const logs = await prisma.auditLog.findMany({
      where: {
        organisationId,
        action: "REVERSE",
        entityType: "Voucher",
        ...dateFilter,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const results: ReversalException[] = [];
    
    for (const log of logs) {
      const newValues = log.newValues as any;
      const originalVoucher = await prisma.voucher.findUnique({
        where: { id: log.entityId },
        select: { number: true },
      });
      
      const reversalVoucher = newValues?.reversalVoucherId 
        ? await prisma.voucher.findUnique({
            where: { id: newValues.reversalVoucherId },
            select: { number: true },
          })
        : null;

      results.push({
        originalVoucherId: log.entityId,
        originalVoucherNumber: originalVoucher?.number || log.entityId,
        reversalVoucherId: newValues?.reversalVoucherId || "",
        reversalVoucherNumber: reversalVoucher?.number || "",
        reversalDate: log.createdAt,
        userId: log.userId,
        userName: `${log.user.firstName} ${log.user.lastName}`,
        reason: newValues?.reason || "No reason provided",
      });
    }

    return results;
  }

  static async getFullReport(organisationId: string, startDate?: Date, endDate?: Date) {
    const [
      summary,
      backdatedPostings,
      reopenedPeriods,
      missingAttachments,
      manualJournals,
      periodOverrides,
      reversals,
    ] = await Promise.all([
      this.getSummary(organisationId, startDate, endDate),
      this.getBackdatedPostings(organisationId, startDate, endDate),
      this.getReopenedPeriods(organisationId, startDate, endDate),
      this.getMissingAttachments(organisationId, startDate, endDate),
      this.getManualJournals(organisationId, startDate, endDate),
      this.getPeriodOverrides(organisationId, startDate, endDate),
      this.getReversals(organisationId, startDate, endDate),
    ]);

    return {
      summary,
      backdatedPostings,
      reopenedPeriods,
      missingAttachments,
      manualJournals,
      periodOverrides,
      reversals,
      generatedAt: new Date(),
    };
  }

  private static buildDateFilter(startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) return {};
    
    const filter: any = { createdAt: {} };
    if (startDate) filter.createdAt.gte = startDate;
    if (endDate) filter.createdAt.lte = endDate;
    
    return filter;
  }
}
