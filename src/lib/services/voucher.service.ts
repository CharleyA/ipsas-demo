import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { CreateVoucherInput, UpdateVoucherInput, VoucherLineInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";
import { FiscalPeriodService } from "./fiscal-period.service";

export class VoucherService {
  static async create(data: CreateVoucherInput, creatorId: string) {
    const period = await FiscalPeriodService.findById(data.fiscalPeriodId);
    if (!period) throw new Error("Fiscal period not found");
    if (period.status !== "OPEN") throw new Error("Cannot create voucher in closed/locked period");

    const voucherNumber = await this.generateVoucherNumber(data.organisationId, data.voucherTypeId);

    this.validateDoubleEntry(data.lines);

    const voucher = await prisma.voucher.create({
      data: {
        organisationId: data.organisationId,
        voucherTypeId: data.voucherTypeId,
        fiscalPeriodId: data.fiscalPeriodId,
        voucherNumber,
        voucherDate: new Date(data.voucherDate),
        description: data.description,
        reference: data.reference,
        status: "DRAFT",
        createdById: creatorId,
        lines: {
          create: data.lines.map(line => ({
            lineNumber: line.lineNumber,
            description: line.description,
            debitAccountId: line.debitAccountId,
            creditAccountId: line.creditAccountId,
            currencyCode: line.currencyCode,
            amountFc: new Decimal(line.amountFc),
            fxRate: new Decimal(line.fxRate),
            amountLc: new Decimal(line.amountLc),
          })),
        },
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
            debitAccount: { select: { id: true, code: true, name: true } },
            creditAccount: { select: { id: true, code: true, name: true } },
            currency: true,
          },
          orderBy: { lineNumber: "asc" },
        },
        voucherType: true,
        fiscalPeriod: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        postedBy: { select: { id: true, firstName: true, lastName: true } },
        attachments: { include: { attachment: true } },
        journalEntry: true,
      },
    });
  }

  static async update(id: string, data: UpdateVoucherInput, actorId: string) {
    const oldVoucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true },
    });
    
    if (!oldVoucher) throw new Error("Voucher not found");
    if (oldVoucher.status !== "DRAFT") {
      throw new Error("Only draft vouchers can be edited");
    }

    if (data.lines) {
      this.validateDoubleEntry(data.lines);
    }

    const voucher = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.voucherLine.deleteMany({ where: { voucherId: id } });
        await tx.voucherLine.createMany({
          data: data.lines.map(line => ({
            voucherId: id,
            lineNumber: line.lineNumber,
            description: line.description,
            debitAccountId: line.debitAccountId,
            creditAccountId: line.creditAccountId,
            currencyCode: line.currencyCode,
            amountFc: new Decimal(line.amountFc),
            fxRate: new Decimal(line.fxRate),
            amountLc: new Decimal(line.amountLc),
          })),
        });
      }

      return tx.voucher.update({
        where: { id },
        data: {
          voucherDate: data.voucherDate ? new Date(data.voucherDate) : undefined,
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
      data: {
        status: "SUBMITTED",
        submittedById: actorId,
        submittedAt: new Date(),
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
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "SUBMITTED") throw new Error("Only submitted vouchers can be approved");

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: actorId,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "APPROVE",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "APPROVED", approvalNotes: notes },
    });

    return updated;
  }

  static async reject(id: string, actorId: string, reason: string) {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "SUBMITTED") throw new Error("Only submitted vouchers can be rejected");

    const updated = await prisma.voucher.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "REJECT",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "REJECTED", rejectionReason: reason },
    });

    return updated;
  }

  static async post(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, fiscalPeriod: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "APPROVED") throw new Error("Only approved vouchers can be posted");
    if (voucher.fiscalPeriod.status !== "OPEN") throw new Error("Cannot post to closed/locked period");

    const entryNumber = await this.generateEntryNumber(voucher.organisationId);

    const result = await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          organisationId: voucher.organisationId,
          fiscalPeriodId: voucher.fiscalPeriodId,
          voucherId: id,
          entryNumber,
          entryDate: voucher.voucherDate,
          description: voucher.description,
          postedById: actorId,
          lines: {
            create: voucher.lines.flatMap((line, idx) => {
              const entries = [];
              if (line.debitAccountId) {
                entries.push({
                  lineNumber: idx * 2 + 1,
                  accountId: line.debitAccountId,
                  description: line.description,
                  currencyCode: line.currencyCode,
                  debitFc: line.amountFc,
                  creditFc: new Decimal(0),
                  fxRate: line.fxRate,
                  debitLc: line.amountLc,
                  creditLc: new Decimal(0),
                });
              }
              if (line.creditAccountId) {
                entries.push({
                  lineNumber: idx * 2 + 2,
                  accountId: line.creditAccountId,
                  description: line.description,
                  currencyCode: line.currencyCode,
                  debitFc: new Decimal(0),
                  creditFc: line.amountFc,
                  fxRate: line.fxRate,
                  debitLc: new Decimal(0),
                  creditLc: line.amountLc,
                });
              }
              return entries;
            }),
          },
        },
      });

      const updatedVoucher = await tx.voucher.update({
        where: { id },
        data: {
          status: "POSTED",
          postedById: actorId,
          postedAt: new Date(),
        },
      });

      return { voucher: updatedVoucher, journalEntry };
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "POST",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "POSTED", journalEntryId: result.journalEntry.id },
    });

    return result;
  }

  static async reverse(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, fiscalPeriod: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "POSTED") throw new Error("Only posted vouchers can be reversed");

    const currentPeriod = await FiscalPeriodService.getCurrentPeriod(voucher.organisationId);
    if (!currentPeriod || currentPeriod.status !== "OPEN") {
      throw new Error("No open fiscal period for reversal");
    }

    const reversalVoucherNumber = await this.generateVoucherNumber(voucher.organisationId, voucher.voucherTypeId);

    const reversedLines = voucher.lines.map(line => ({
      lineNumber: line.lineNumber,
      description: `Reversal: ${line.description ?? ""}`,
      debitAccountId: line.creditAccountId,
      creditAccountId: line.debitAccountId,
      currencyCode: line.currencyCode,
      amountFc: line.amountFc,
      fxRate: line.fxRate,
      amountLc: line.amountLc,
    }));

    const reversal = await prisma.voucher.create({
      data: {
        organisationId: voucher.organisationId,
        voucherTypeId: voucher.voucherTypeId,
        fiscalPeriodId: currentPeriod.id,
        voucherNumber: reversalVoucherNumber,
        voucherDate: new Date(),
        description: `Reversal of ${voucher.voucherNumber}: ${voucher.description}`,
        reference: voucher.voucherNumber,
        status: "DRAFT",
        createdById: actorId,
        reversalOfId: id,
        lines: { create: reversedLines },
      },
      include: { lines: true },
    });

    await prisma.voucher.update({
      where: { id },
      data: {
        status: "REVERSED",
        reversedById: actorId,
      },
    });

    await AuditService.log({
      userId: actorId,
      organisationId: voucher.organisationId,
      action: "REVERSE",
      entityType: "Voucher",
      entityId: id,
      oldValues: { status: voucher.status },
      newValues: { status: "REVERSED", reversalVoucherId: reversal.id },
    });

    return reversal;
  }

  static async listByOrganisation(organisationId: string, options?: {
    status?: string;
    fiscalPeriodId?: string;
    voucherTypeId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = { organisationId };

    if (options?.status) where.status = options.status;
    if (options?.fiscalPeriodId) where.fiscalPeriodId = options.fiscalPeriodId;
    if (options?.voucherTypeId) where.voucherTypeId = options.voucherTypeId;

    if (options?.startDate || options?.endDate) {
      where.voucherDate = {};
      if (options.startDate) (where.voucherDate as Record<string, unknown>).gte = options.startDate;
      if (options.endDate) (where.voucherDate as Record<string, unknown>).lte = options.endDate;
    }

    return prisma.voucher.findMany({
      where,
      include: {
        voucherType: true,
        fiscalPeriod: { select: { id: true, name: true, year: true, period: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  private static validateDoubleEntry(lines: VoucherLineInput[]) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of lines) {
      if (line.debitAccountId) totalDebits += line.amountLc;
      if (line.creditAccountId) totalCredits += line.amountLc;
    }

    const diff = Math.abs(totalDebits - totalCredits);
    if (diff > 0.01) {
      throw new Error(`Double-entry violation: Debits (${totalDebits}) must equal Credits (${totalCredits})`);
    }
  }

  private static async generateVoucherNumber(organisationId: string, voucherTypeId: string) {
    const voucherType = await prisma.voucherType.findUnique({ where: { id: voucherTypeId } });
    if (!voucherType) throw new Error("Voucher type not found");

    const year = new Date().getFullYear();
    const count = await prisma.voucher.count({
      where: {
        organisationId,
        voucherTypeId,
        voucherNumber: { startsWith: `${voucherType.prefix}-${year}` },
      },
    });

    return `${voucherType.prefix}-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private static async generateEntryNumber(organisationId: string) {
    const year = new Date().getFullYear();
    const count = await prisma.journalEntry.count({
      where: {
        organisationId,
        entryNumber: { startsWith: `JE-${year}` },
      },
    });

    return `JE-${year}-${String(count + 1).padStart(6, "0")}`;
  }
}
