import prisma from "@/lib/db";
import { Prisma, VoucherStatus, VoucherType, FiscalPeriodStatus } from "@prisma/client";
import type { CreateVoucherInput, UpdateVoucherInput, VoucherLineInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";
import { 
  computeLineAmounts, 
  validateDoubleEntry, 
  isImmutableStatus, 
  canEditVoucher, 
  canReverseVoucher,
  roundLc,
  LC_DECIMALS 
} from "@/lib/accounting-utils";

const Decimal = Prisma.Decimal;

const PERIOD_OVERRIDE_ROLES = ["ADMIN", "HEADMASTER"];

export class VoucherService {
  static async create(data: CreateVoucherInput, creatorId: string) {
    const period = await this.validatePeriodForPosting(data.periodId, data.date, creatorId);
    
    const number = await this.generateVoucherNumber(data.organisationId, data.type);

    const processedLines = data.lines.map(line => {
      const amounts = computeLineAmounts(line.debit, line.credit, line.fxRate);
      return {
        lineNumber: line.lineNumber,
        description: line.description,
        accountId: line.accountId,
        costCentreId: line.costCentreId,
        fundId: line.fundId,
        programmeId: line.programmeId,
        projectId: line.projectId,
        currencyCode: line.currencyCode,
        fxRate: amounts.fxRate,
        amountFc: amounts.amountFc,
        amountLc: amounts.amountLc,
        debit: amounts.debitFc,
        credit: amounts.creditFc,
        debitFc: amounts.debitFc,
        creditFc: amounts.creditFc,
        debitLc: amounts.debitLc,
        creditLc: amounts.creditLc,
      };
    });

    validateDoubleEntry(data.lines);

    const voucher = await prisma.voucher.create({
      data: {
        organisationId: data.organisationId,
        type: data.type,
        periodId: data.periodId,
        number,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference,
        status: "DRAFT",
        createdById: creatorId,
        lines: { create: processedLines },
      },
      include: { lines: true },
    });

    await AuditService.log({
      userId: creatorId,
      organisationId: data.organisationId,
      action: "CREATE",
      entityType: "Voucher",
      entityId: voucher.id,
      newValues: voucher,
    });

    return voucher;
  }

  static async findById(id: string) {
    return prisma.voucher.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
            currency: true,
            costCentre: true,
            fund: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        period: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        attachments: { include: { attachment: true } },
        glHeader: true,
        reversedBy: { select: { id: true, number: true, date: true, status: true } },
        reverses: { select: { id: true, number: true, date: true, status: true } },
      },
    });
  }

  static async update(id: string, data: UpdateVoucherInput, actorId: string) {
    const oldVoucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true },
    });
    
    if (!oldVoucher) throw new Error("Voucher not found");
    
    if (!canEditVoucher(oldVoucher.status)) {
      throw new Error(`Cannot edit voucher in ${oldVoucher.status} status. Only DRAFT vouchers can be edited.`);
    }

    if (data.lines) {
      validateDoubleEntry(data.lines);
    }

    const voucher = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.voucherLine.deleteMany({ where: { voucherId: id } });
        
        const processedLines = data.lines.map(line => {
          const amounts = computeLineAmounts(line.debit, line.credit, line.fxRate);
          return {
            voucherId: id,
            lineNumber: line.lineNumber,
            description: line.description,
            accountId: line.accountId,
            costCentreId: line.costCentreId,
            fundId: line.fundId,
            programmeId: line.programmeId,
            projectId: line.projectId,
            currencyCode: line.currencyCode,
            fxRate: amounts.fxRate,
            amountFc: amounts.amountFc,
            amountLc: amounts.amountLc,
            debit: amounts.debitFc,
            credit: amounts.creditFc,
            debitFc: amounts.debitFc,
            creditFc: amounts.creditFc,
            debitLc: amounts.debitLc,
            creditLc: amounts.creditLc,
          };
        });
        
        await tx.voucherLine.createMany({ data: processedLines });
      }

      return tx.voucher.update({
        where: { id },
        data: {
          date: data.date ? new Date(data.date) : undefined,
          description: data.description,
          reference: data.reference,
        },
        include: { lines: true },
      });
    });

    await AuditService.log({
      userId: actorId,
      organisationId: oldVoucher.organisationId,
      action: "UPDATE",
      entityType: "Voucher",
      entityId: id,
      oldValues: oldVoucher,
      newValues: voucher,
    });

    return voucher;
  }

  static async submit(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "DRAFT") throw new Error("Only draft vouchers can be submitted");

    const updated = await prisma.voucher.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });

    await prisma.approvalTask.create({
      data: {
        voucherId: id,
        userId: actorId,
        status: "PENDING",
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "SUBMIT",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "SUBMITTED" },
    });

    return updated;
  }

  static async approve(id: string, actorId: string, notes?: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { approvals: { where: { status: "PENDING" } } }
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "SUBMITTED") throw new Error("Only submitted vouchers can be approved");

    const result = await prisma.$transaction(async (tx) => {
      await tx.approvalTask.updateMany({
        where: { voucherId: id, status: "PENDING" },
        data: {
          status: "APPROVED",
          userId: actorId,
          notes,
          updatedAt: new Date(),
        },
      });

      return tx.voucher.update({
        where: { id },
        data: { status: "APPROVED" },
      });
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "APPROVE",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "APPROVED", notes },
    });

    return result;
  }

  static async post(id: string, actorId: string, overridePeriodLock = false) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, period: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "APPROVED") throw new Error("Only approved vouchers can be posted");

    await this.validatePeriodForPosting(
      voucher.periodId, 
      voucher.date.toISOString(), 
      actorId, 
      overridePeriodLock
    );

    const isBackdated = await this.checkBackdatedPosting(voucher.organisationId, voucher.date);
    if (isBackdated) {
      await AuditService.log({
        userId: actorId,
        organisationId: voucher.organisationId,
        action: "BACKDATED_POSTING_ATTEMPT",
        entityType: "Voucher",
        entityId: id,
        newValues: { voucherDate: voucher.date, postDate: new Date() },
      });
    }

    const entryNumber = await this.generateEntryNumber(voucher.organisationId);

    const result = await prisma.$transaction(async (tx) => {
      const glHeader = await tx.glHeader.create({
        data: {
          organisationId: voucher.organisationId,
          periodId: voucher.periodId,
          voucherId: id,
          entryNumber,
          entryDate: voucher.date,
          description: voucher.description,
          entries: {
            create: voucher.lines.map((line) => ({
              lineNumber: line.lineNumber,
              accountId: line.accountId,
              description: line.description,
              costCentreId: line.costCentreId,
              fundId: line.fundId,
              programmeId: line.programmeId,
              projectId: line.projectId,
              currencyCode: line.currencyCode,
              fxRate: line.fxRate,
              amountFc: line.amountFc,
              amountLc: line.amountLc,
              debitFc: line.debitFc ?? line.debit,
              creditFc: line.creditFc ?? line.credit,
              debitLc: line.debitLc ?? (line.debit ? roundLc(new Decimal(line.debit.toString()).mul(line.fxRate)) : null),
              creditLc: line.creditLc ?? (line.credit ? roundLc(new Decimal(line.credit.toString()).mul(line.fxRate)) : null),
            })),
          },
        },
      });

      const updatedVoucher = await tx.voucher.update({
        where: { id },
        data: { status: "POSTED" },
      });

      return { voucher: updatedVoucher, glHeader };
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "POST",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "POSTED", glHeaderId: result.glHeader.id, isBackdated },
    });

    return result;
  }

  static async reverse(id: string, actorId: string, reason?: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, period: true, reversedBy: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (!canReverseVoucher(voucher.status)) {
      throw new Error(`Cannot reverse voucher in ${voucher.status} status. Only POSTED vouchers can be reversed.`);
    }
    if (voucher.reversedBy) {
      throw new Error(`Voucher has already been reversed by ${voucher.reversedBy.number}`);
    }

    const currentPeriod = await this.getCurrentOpenPeriod(voucher.organisationId);
    if (!currentPeriod) {
      throw new Error("No open accounting period for reversal");
    }

    const reversalNumber = await this.generateVoucherNumber(voucher.organisationId, voucher.type);

    const reversedLines = voucher.lines.map(line => {
      const amounts = computeLineAmounts(
        line.credit ? line.credit.toString() : null,
        line.debit ? line.debit.toString() : null,
        line.fxRate.toString()
      );
      
      return {
        lineNumber: line.lineNumber,
        description: `Reversal: ${line.description ?? ""}`,
        accountId: line.accountId,
        costCentreId: line.costCentreId,
        fundId: line.fundId,
        programmeId: line.programmeId,
        projectId: line.projectId,
        currencyCode: line.currencyCode,
        fxRate: amounts.fxRate,
        amountFc: amounts.amountFc,
        amountLc: amounts.amountLc,
        debit: amounts.debitFc,
        credit: amounts.creditFc,
        debitFc: amounts.debitFc,
        creditFc: amounts.creditFc,
        debitLc: amounts.debitLc,
        creditLc: amounts.creditLc,
      };
    });

    const result = await prisma.$transaction(async (tx) => {
      const reversal = await tx.voucher.create({
        data: {
          organisationId: voucher.organisationId,
          type: voucher.type,
          periodId: currentPeriod.id,
          number: reversalNumber,
          date: new Date(),
          description: `Reversal of ${voucher.number}: ${reason || voucher.description}`,
          reference: voucher.number,
          status: "APPROVED",
          createdById: actorId,
          reversesId: voucher.id,
          lines: { create: reversedLines },
        },
        include: { lines: true },
      });

      await tx.voucher.update({
        where: { id },
        data: { 
          status: "REVERSED",
          reversedById: reversal.id,
        },
      });

      return reversal;
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "REVERSE",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "REVERSED", reversalVoucherId: result.id, reason },
    });

    const posted = await this.post(result.id, actorId);

    return { reversal: result, glHeader: posted.glHeader };
  }

  static async reject(id: string, actorId: string, notes?: string) {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "SUBMITTED") throw new Error("Only submitted vouchers can be rejected");

    const result = await prisma.$transaction(async (tx) => {
      await tx.approvalTask.updateMany({
        where: { voucherId: id, status: "PENDING" },
        data: {
          status: "REJECTED",
          userId: actorId,
          notes,
          updatedAt: new Date(),
        },
      });

      return tx.voucher.update({
        where: { id },
        data: { status: "REJECTED" },
      });
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "REJECT",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "REJECTED", notes },
    });

    return result;
  }

  static async cancel(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new Error("Voucher not found");
    
    if (isImmutableStatus(voucher.status)) {
      throw new Error(`Cannot cancel voucher in ${voucher.status} status. Use reversal instead.`);
    }
    
    if (!["DRAFT", "SUBMITTED", "REJECTED"].includes(voucher.status)) {
      throw new Error("Only draft, submitted, or rejected vouchers can be cancelled");
    }

    const updated = await prisma.voucher.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "CANCEL",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "CANCELLED" },
    });

    return updated;
  }

  static async listByOrganisation(organisationId: string, filters?: { status?: VoucherStatus, type?: VoucherType }) {
    return prisma.voucher.findMany({
      where: {
        organisationId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
      },
      include: {
        lines: true,
        createdBy: { select: { firstName: true, lastName: true } },
        reversedBy: { select: { id: true, number: true } },
        reverses: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private static async validatePeriodForPosting(
    periodId: string, 
    voucherDate: string | Date, 
    actorId: string,
    override = false
  ) {
    const period = await prisma.fiscalPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Accounting period not found");

    const date = new Date(voucherDate);
    if (date < period.startDate || date > period.endDate) {
      throw new Error(`Voucher date ${date.toISOString().split('T')[0]} is outside period ${period.name} (${period.startDate.toISOString().split('T')[0]} - ${period.endDate.toISOString().split('T')[0]})`);
    }

    if (period.status === FiscalPeriodStatus.LOCKED) {
      if (!override) {
        throw new Error(`Period ${period.name} is locked. Posting requires override permission.`);
      }
      
      const userOrg = await prisma.organisationUser.findFirst({
        where: { userId: actorId, organisationId: period.organisationId }
      });
      
      if (!userOrg || !PERIOD_OVERRIDE_ROLES.includes(userOrg.role)) {
        throw new Error(`Only ${PERIOD_OVERRIDE_ROLES.join(", ")} can override locked period restrictions.`);
      }

      await AuditService.log({
        userId: actorId,
        organisationId: period.organisationId,
        action: "PERIOD_LOCK_OVERRIDE",
        entityType: "FiscalPeriod",
        entityId: period.id,
        newValues: { periodName: period.name, override: true },
      });
    }

    if (period.status === FiscalPeriodStatus.CLOSED) {
      throw new Error(`Period ${period.name} is closed. No further postings allowed.`);
    }

    return period;
  }

  private static async getCurrentOpenPeriod(organisationId: string) {
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

  private static async checkBackdatedPosting(organisationId: string, voucherDate: Date): Promise<boolean> {
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - voucherDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 7;
  }

  private static async generateVoucherNumber(organisationId: string, type: string) {
    const year = new Date().getFullYear();
    const prefix = type.substring(0, 3).toUpperCase();
    const count = await prisma.voucher.count({
      where: {
        organisationId,
        type: type as any,
        number: { startsWith: `${prefix}-${year}` },
      },
    });

    return `${prefix}-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private static async generateEntryNumber(organisationId: string) {
    const year = new Date().getFullYear();
    const count = await prisma.gLHeader.count({
      where: {
        organisationId,
        entryNumber: { startsWith: `GL-${year}` },
      },
    });

    return `GL-${year}-${String(count + 1).padStart(6, "0")}`;
  }
}

export class GLEntryService {
  static async updateEntry() {
    throw new Error("GL entries are immutable and cannot be updated. Use voucher reversal instead.");
  }

  static async deleteEntry() {
    throw new Error("GL entries are immutable and cannot be deleted. Use voucher reversal instead.");
  }
}
