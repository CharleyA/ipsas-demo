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
import { CurrencyService } from "./currency.service";
import { AccountService } from "./account.service";

export class ARService {
  static async createInvoice(data: CreateARInvoiceInput, actorId: string) {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) throw new Error("Organisation not found");

    const period = await FiscalPeriodService.getCurrentPeriod(data.organisationId);
    if (!period) throw new Error("No open fiscal period found for today");

    // Fetch exchange rate
    const fxInfo = await CurrencyService.getExchangeRate(data.currencyCode, org.baseCurrency);
    if (!fxInfo) throw new Error(`Exchange rate not found for ${data.currencyCode} to ${org.baseCurrency}`);
    
    const fxRate = fxInfo.rate;
    const totalAmountFc = data.lines.reduce((sum, line) => sum + line.amount, 0);
    const totalAmountLc = totalAmountFc * fxRate;

    // Resolve dynamic accounts
    const receivableAccount = await AccountService.resolveAccountByCurrency(
      data.organisationId,
      "1121", // Fees Receivable Parent
      data.currencyCode
    );

    const revenueAccount = await AccountService.resolveAccountByCurrency(
      data.organisationId,
      "4210", // Fees Revenue Parent
      data.currencyCode
    );

    if (!receivableAccount || !revenueAccount) {
      throw new Error("Could not resolve AR accounts (1121 or 4210) for this currency");
    }

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { firstName: true, lastName: true, studentNumber: true }
    });
    const studentName = student ? `${student.firstName} ${student.lastName} (${student.studentNumber})` : data.studentId;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AR_INVOICE)
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AR_INVOICE",
        periodId: period.id,
        date: new Date(),
        description: data.description || `Invoice for student ${studentName}`,
        studentId: data.studentId,
        lines: [
          // DR Fees Receivable
            {
              lineNumber: 1,
              accountId: receivableAccount.id,
              description: `Fees Receivable (${data.currencyCode}) - ${studentName}`,
              currencyCode: data.currencyCode,
              amountFc: totalAmountFc,
              fxRate: fxRate,
              amountLc: totalAmountLc,
              debit: totalAmountFc,
              fundId: data.fundId,
              projectId: data.projectId,
            },
            // CR Fees Revenue
            {
              lineNumber: 2,
              accountId: revenueAccount.id,
              description: `Fees Revenue (${data.currencyCode}) - ${studentName}`,
              currencyCode: data.currencyCode,
              amountFc: totalAmountFc,
              fxRate: fxRate,
              amountLc: totalAmountLc,
              credit: totalAmountFc,
              fundId: data.fundId,
              projectId: data.projectId,
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
          amount: new Decimal(totalAmountFc),
          balance: new Decimal(totalAmountFc),
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

    const period = await FiscalPeriodService.getCurrentPeriod(data.organisationId);
    if (!period) throw new Error("No open fiscal period found");

    // Fetch exchange rate
    const fxInfo = await CurrencyService.getExchangeRate(data.currencyCode, org.baseCurrency);
    if (!fxInfo) throw new Error(`Exchange rate not found for ${data.currencyCode} to ${org.baseCurrency}`);
    
    const fxRate = fxInfo.rate;
    const amountLc = data.amount * fxRate;

    // Resolve dynamic accounts
    const receivableAccount = await AccountService.resolveAccountByCurrency(
      data.organisationId,
      "1121", // Fees Receivable Parent
      data.currencyCode
    );

    if (!receivableAccount) {
      throw new Error("Could not resolve Fees Receivable account (1121) for this currency");
    }

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { firstName: true, lastName: true, studentNumber: true }
    });
    const studentName = student ? `${student.firstName} ${student.lastName} (${student.studentNumber})` : data.studentId;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AR_RECEIPT)
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AR_RECEIPT",
        periodId: period.id,
        date: new Date(data.date),
        description: `Fee Payment (${data.currencyCode}) - ${studentName}`,
        reference: data.reference,
        studentId: data.studentId,
          lines: [
            // DR Bank/Cash
            {
              lineNumber: 1,
              accountId: data.bankAccountId,
              description: `Fee Receipt - ${data.paymentMethod || 'Cash'} - ${studentName}`,
              currencyCode: data.currencyCode,
              amountFc: data.amount,
              fxRate: fxRate,
              amountLc: amountLc,
              debit: data.amount,
            },
            // CR Fees Receivable
            {
              lineNumber: 2,
              accountId: receivableAccount.id,
              description: `Fee Payment (${data.currencyCode}) - ${studentName}`,
              currencyCode: data.currencyCode,
              amountFc: data.amount,
              fxRate: fxRate,
              amountLc: amountLc,
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

  static async getInvoices(organisationId: string) {
    return prisma.aRInvoice.findMany({
      where: { organisationId },
      include: {
        student: true,
        voucher: {
          include: {
            createdBy: { select: { firstName: true, lastName: true } }
          }
        },
        lines: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getReceipts(organisationId: string) {
    return prisma.aRReceipt.findMany({
      where: { organisationId },
      include: {
        student: true,
        voucher: {
          include: {
            createdBy: { select: { firstName: true, lastName: true } }
          }
        },
        allocations: {
          include: { invoice: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
