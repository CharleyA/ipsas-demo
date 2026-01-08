import prisma from "@/lib/db";
import { Decimal } from "@prisma/client";
import { 
  CreateARInvoiceInput, 
  CreateARReceiptInput, 
  AllocateARReceiptInput 
} from "@/lib/validations/schemas";
import { VoucherService } from "./voucher.service";
import { FiscalPeriodService } from "./fiscal-period.service";
import { AuditService } from "./audit.service";

export class ARService {
  static async createInvoice(data: CreateARInvoiceInput, actorId: string) {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) throw new Error("Organisation not found");
    if (!org.arReceivableAccountId || !org.arRevenueAccountId) {
      throw new Error("AR accounts not configured for this organisation");
    }

    const period = await FiscalPeriodService.getCurrentPeriod(data.organisationId);
    if (!period) throw new Error("No open fiscal period found for today");

    const totalAmount = data.lines.reduce((sum, line) => sum + line.amount, 0);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AR_INVOICE)
      // Note: We'll create the voucher via VoucherService or manually to link it correctly
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AR_INVOICE",
        periodId: period.id,
        date: new Date(),
        description: data.description || `Invoice for student ${data.studentId}`,
        lines: [
          // DR Fees Receivable
          {
            lineNumber: 1,
            accountId: org.arReceivableAccountId!,
            description: `Fees Receivable - Student ${data.studentId}`,
            currencyCode: data.currencyCode,
            amountFc: totalAmount,
            fxRate: 1, // Simplified for MVP
            amountLc: totalAmount,
            debit: totalAmount,
          },
          // CR Fees Revenue (multiple lines if needed, but here we sum)
          {
            lineNumber: 2,
            accountId: org.arRevenueAccountId!,
            description: `Fees Revenue - Student ${data.studentId}`,
            currencyCode: data.currencyCode,
            amountFc: totalAmount,
            fxRate: 1,
            amountLc: totalAmount,
            credit: totalAmount,
          }
        ]
      }, actorId);

      // 2. Create ARInvoice
      const arInvoice = await tx.aRInvoice.create({
        data: {
          organisationId: data.organisationId,
          voucherId: voucher.id,
          studentId: data.studentId,
          currencyCode: data.currencyCode,
          term: data.term,
          amount: new Decimal(totalAmount),
          balance: new Decimal(totalAmount),
          dueDate: new Date(data.dueDate),
          lines: {
            create: data.lines.map(line => ({
              description: line.description,
              quantity: new Decimal(line.quantity),
              unitPrice: new Decimal(line.unitPrice),
              amount: new Decimal(line.amount),
            }))
          }
        }
      });

      return arInvoice;
    });
  }

  static async createReceipt(data: CreateARReceiptInput, actorId: string) {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) throw new Error("Organisation not found");
    if (!org.arReceivableAccountId) {
      throw new Error("AR Receivable account not configured");
    }

    const period = await FiscalPeriodService.getCurrentPeriod(data.organisationId);
    if (!period) throw new Error("No open fiscal period found");

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AR_RECEIPT)
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AR_RECEIPT",
        periodId: period.id,
        date: new Date(data.date),
        description: `Fee Payment - Student ${data.studentId}`,
        reference: data.reference,
        lines: [
          // DR Bank/Cash
          {
            lineNumber: 1,
            accountId: data.bankAccountId,
            description: `Fee Receipt - ${data.paymentMethod || 'Cash'}`,
            currencyCode: data.currencyCode,
            amountFc: data.amount,
            fxRate: 1,
            amountLc: data.amount,
            debit: data.amount,
          },
          // CR Fees Receivable
          {
            lineNumber: 2,
            accountId: org.arReceivableAccountId!,
            description: `Unallocated Payment - Student ${data.studentId}`,
            currencyCode: data.currencyCode,
            amountFc: data.amount,
            fxRate: 1,
            amountLc: data.amount,
            credit: data.amount,
          }
        ]
      }, actorId);

      // 2. Create ARReceipt
      const arReceipt = await tx.aRReceipt.create({
        data: {
          organisationId: data.organisationId,
          voucherId: voucher.id,
          studentId: data.studentId,
          currencyCode: data.currencyCode,
          amount: new Decimal(data.amount),
          unallocated: new Decimal(data.amount),
          paymentMethod: data.paymentMethod,
          reference: data.reference,
        }
      });

      return arReceipt;
    });
  }

  static async allocate(data: AllocateARReceiptInput, actorId: string) {
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.aRReceipt.findUnique({
        where: { id: data.receiptId },
        include: { voucher: true }
      });
      if (!receipt) throw new Error("Receipt not found");
      
      let totalAllocated = new Decimal(0);

      for (const allocation of data.allocations) {
        const invoice = await tx.aRInvoice.findUnique({
          where: { id: allocation.invoiceId }
        });
        if (!invoice) throw new Error(`Invoice ${allocation.invoiceId} not found`);
        
        const allocAmount = new Decimal(allocation.amount);
        if (allocAmount.gt(invoice.balance)) {
          throw new Error(`Allocation amount exceeds invoice balance for ${invoice.id}`);
        }

        // Create Allocation Record
        await tx.aRAllocation.create({
          data: {
            invoiceId: invoice.id,
            receiptId: receipt.id,
            amount: allocAmount,
          }
        });

        // Update Invoice Balance
        await tx.aRInvoice.update({
          where: { id: invoice.id },
          data: { balance: { decrement: allocAmount } }
        });

        totalAllocated = totalAllocated.add(allocAmount);
      }

      // Update Receipt Unallocated
      if (totalAllocated.gt(receipt.unallocated)) {
        throw new Error("Total allocated exceeds receipt unallocated amount");
      }

      await tx.aRReceipt.update({
        where: { id: receipt.id },
        data: { unallocated: { decrement: totalAllocated } }
      });

      return { success: true, allocated: totalAllocated };
    });
  }

  static async getStudentStatement(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        arInvoices: {
          include: { voucher: true },
          orderBy: { createdAt: "desc" }
        },
        arReceipts: {
          include: { voucher: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!student) throw new Error("Student not found");

    // Combine and sort transactions
    const transactions = [
      ...student.arInvoices.map(inv => ({
        id: inv.id,
        date: inv.voucher.date,
        type: "INVOICE",
        number: inv.voucher.number,
        description: inv.voucher.description,
        amount: inv.amount,
        balance: inv.balance,
        status: inv.voucher.status,
      })),
      ...student.arReceipts.map(rec => ({
        id: rec.id,
        date: rec.voucher.date,
        type: "RECEIPT",
        number: rec.voucher.number,
        description: rec.voucher.description,
        amount: rec.amount.negated(),
        unallocated: rec.unallocated,
        status: rec.voucher.status,
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalBalance = student.arInvoices.reduce((sum, inv) => sum.add(inv.balance), new Decimal(0))
      .sub(student.arReceipts.reduce((sum, rec) => sum.add(rec.unallocated), new Decimal(0)));

    return {
      student,
      transactions,
      totalBalance
    };
  }

  static async postInvoice(id: string, actorId: string) {
    const arInvoice = await prisma.aRInvoice.findUnique({
      where: { id },
      include: { voucher: true }
    });
    if (!arInvoice) throw new Error("Invoice not found");
    
    // Call VoucherService.post which handles GL entry generation
    const result = await VoucherService.post(arInvoice.voucherId, actorId);
    
    // Update ARInvoice status if needed (optional as it's linked to Voucher)
    await prisma.aRInvoice.update({
      where: { id },
      data: { status: "POSTED" }
    });

    return result;
  }

  static async postReceipt(id: string, actorId: string) {
    const arReceipt = await prisma.aRReceipt.findUnique({
      where: { id },
      include: { voucher: true }
    });
    if (!arReceipt) throw new Error("Receipt not found");
    
    const result = await VoucherService.post(arReceipt.voucherId, actorId);
    
    return result;
  }
}
