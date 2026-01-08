import prisma from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { CreateVoucherInput, UpdateVoucherInput, VoucherLineInput } from "@/lib/validations/schemas";
import { AuditService } from "./audit.service";
import { AccountingPeriodService } from "./accounting-period.service";

export class VoucherService {
  static async create(data: CreateVoucherInput, creatorId: string) {
    const period = await AccountingPeriodService.findById(data.periodId);
    if (!period) throw new Error("Accounting period not found");
    if (period.isClosed || period.isLocked) {
      throw new Error("Cannot create voucher in closed/locked period");
    }

    const number = await this.generateVoucherNumber(data.organisationId, data.type);

    this.validateDoubleEntry(data.lines);

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
        lines: {
          create: data.lines.map(line => ({
            lineNumber: line.lineNumber,
            description: line.description,
            accountId: line.accountId,
            costCentreId: line.costCentreId,
            fundId: line.fundId,
            programmeId: line.programmeId,
            projectId: line.projectId,
            currencyCode: line.currencyCode,
            amountFc: new Decimal(line.amountFc),
            fxRate: new Decimal(line.fxRate),
            amountLc: new Decimal(line.amountLc),
            debit: line.debit ? new Decimal(line.debit) : null,
            credit: line.credit ? new Decimal(line.credit) : null,
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
            accountId: line.accountId,
            costCentreId: line.costCentreId,
            fundId: line.fundId,
            programmeId: line.programmeId,
            projectId: line.projectId,
            currencyCode: line.currencyCode,
            amountFc: new Decimal(line.amountFc),
            fxRate: new Decimal(line.fxRate),
            amountLc: new Decimal(line.amountLc),
            debit: line.debit ? new Decimal(line.debit) : null,
            credit: line.credit ? new Decimal(line.credit) : null,
          })),
        });
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
        userId: actorId, // In a real app, this would be a different user
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

  static async post(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, period: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "APPROVED") throw new Error("Only approved vouchers can be posted");
    if (voucher.period.isClosed || voucher.period.isLocked) {
      throw new Error("Cannot post to closed/locked period");
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
              amountFc: line.amountFc,
              fxRate: line.fxRate,
              amountLc: line.amountLc,
              debitFc: line.debit,
              creditFc: line.credit,
              // For simplicity, we assume lc debit/credit matches fc * rate
              debitLc: line.debit ? line.debit.mul(line.fxRate) : null,
              creditLc: line.credit ? line.credit.mul(line.fxRate) : null,
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
      newValues: { status: "POSTED", glHeaderId: result.glHeader.id },
    });

    return result;
  }

  static async reverse(id: string, actorId: string) {
    const voucher = await prisma.voucher.findUnique({ 
      where: { id },
      include: { lines: true, period: true },
    });
    
    if (!voucher) throw new Error("Voucher not found");
    if (voucher.status !== "POSTED") throw new Error("Only posted vouchers can be reversed");

    const currentPeriod = await AccountingPeriodService.getCurrentPeriod(voucher.organisationId);
    if (!currentPeriod) {
      throw new Error("No open accounting period for reversal");
    }

    const reversalNumber = await this.generateVoucherNumber(voucher.organisationId, voucher.type);

    const reversedLines = voucher.lines.map(line => ({
      lineNumber: line.lineNumber,
      description: `Reversal: ${line.description ?? ""}`,
      accountId: line.accountId,
      costCentreId: line.costCentreId,
      fundId: line.fundId,
      programmeId: line.programmeId,
      projectId: line.projectId,
      currencyCode: line.currencyCode,
      amountFc: line.amountFc,
      fxRate: line.fxRate,
      amountLc: line.amountLc,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
    }));

    const reversal = await prisma.voucher.create({
      data: {
        organisationId: voucher.organisationId,
        type: voucher.type,
        periodId: currentPeriod.id,
        number: reversalNumber,
        date: new Date(),
        description: `Reversal of ${voucher.number}: ${voucher.description}`,
        reference: voucher.number,
        status: "DRAFT",
        createdById: actorId,
        lines: { create: reversedLines },
      },
      include: { lines: true },
    });

    await prisma.voucher.update({
      where: { id },
      data: { status: "REVERSED" },
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
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private static validateDoubleEntry(lines: VoucherLineInput[]) {
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const line of lines) {
      if (line.debit) totalDebits = totalDebits.add(new Decimal(line.debit).mul(line.fxRate));
      if (line.credit) totalCredits = totalCredits.add(new Decimal(line.credit).mul(line.fxRate));
    }

    const diff = totalDebits.sub(totalCredits).abs();
    if (diff.gt(0.01)) {
      throw new Error(`Double-entry violation: Debits (${totalDebits}) must equal Credits (${totalCredits}) in base currency`);
    }
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
    const count = await prisma.glHeader.count({
      where: {
        organisationId,
        entryNumber: { startsWith: `GL-${year}` },
      },
    });

    return `GL-${year}-${String(count + 1).padStart(6, "0")}`;
  }
}
