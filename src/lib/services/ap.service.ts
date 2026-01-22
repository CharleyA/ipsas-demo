import prisma from "@/lib/db";
import { Decimal } from "@prisma/client";
import { 
  CreateAPBillInput, 
  CreateAPPaymentInput, 
  AllocateAPPaymentInput 
} from "@/lib/validations/schemas";
import { VoucherService } from "./voucher.service";
import { FiscalPeriodService } from "./fiscal-period.service";
import { AuditService } from "./audit.service";
import { CurrencyService } from "./currency.service";
import { AccountService } from "./account.service";

export class APService {
  static async createBill(data: CreateAPBillInput, actorId: string) {
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

    // Resolve dynamic account for Trade Payables
    const payableAccount = await AccountService.resolveAccountByCurrency(
      data.organisationId,
      "2111", // Trade Payables Parent
      data.currencyCode
    );

    if (!payableAccount) {
      throw new Error("Could not resolve Trade Payables account (2111) for this currency");
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      select: { name: true, code: true }
    });
    const supplierName = supplier ? `${supplier.name} (${supplier.code})` : data.supplierId;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AP_BILL)
      const voucherLines = [
        // CR Trade Payables
        {
          lineNumber: data.lines.length + 1,
          accountId: payableAccount.id,
          description: `Trade Payable (${data.currencyCode}) - ${supplierName}`,
          currencyCode: data.currencyCode,
          amountFc: totalAmountFc,
          fxRate: fxRate,
          amountLc: totalAmountLc,
          credit: totalAmountFc,
          fundId: data.fundId,
          projectId: data.projectId,
        }
      ];

      // Add DR lines from bill lines
      data.lines.forEach((line, index) => {
        voucherLines.push({
          lineNumber: index + 1,
          accountId: line.accountId,
          description: line.description,
          currencyCode: data.currencyCode,
          amountFc: line.amount,
          fxRate: fxRate,
          amountLc: line.amount * fxRate,
          debit: line.amount,
          fundId: data.fundId,
          projectId: data.projectId,
        });
      });

      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AP_BILL",
        periodId: period.id,
        date: new Date(),
        description: data.description || `Bill from supplier ${data.supplierId}`,
        supplierId: data.supplierId,
        lines: voucherLines
      }, actorId);

      // 2. Create APBill
      const apBill = await tx.aPBill.create({
        data: {
          organisationId: data.organisationId,
          voucherId: voucher.id,
          supplierId: data.supplierId,
          currencyCode: data.currencyCode,
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

      return apBill;
    });
  }

  static async createPayment(data: CreateAPPaymentInput, actorId: string) {
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

    // Resolve dynamic account for Trade Payables
    const payableAccount = await AccountService.resolveAccountByCurrency(
      data.organisationId,
      "2111", // Trade Payables Parent
      data.currencyCode
    );

    if (!payableAccount) {
      throw new Error("Could not resolve Trade Payables account (2111) for this currency");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Voucher (AP_PAYMENT)
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "AP_PAYMENT",
        periodId: period.id,
        date: new Date(data.date),
        description: `Supplier Payment (${data.currencyCode}) - Supplier ${data.supplierId}`,
        reference: data.reference,
        supplierId: data.supplierId,
        lines: [
        // CR Bank/Cash
        {
          lineNumber: 1,
          accountId: data.bankAccountId,
          description: `Supplier Payment - ${data.paymentMethod || 'Transfer'}`,
          currencyCode: data.currencyCode,
          amountFc: data.amount,
          fxRate: fxRate,
          amountLc: amountLc,
          credit: data.amount,
        },
        // DR Trade Payables
        {
          lineNumber: 2,
          accountId: payableAccount.id,
          description: `Payment to Supplier ${data.supplierId} (${data.currencyCode})`,
          currencyCode: data.currencyCode,
          amountFc: data.amount,
          fxRate: fxRate,
          amountLc: amountLc,
          debit: data.amount,
        }
        ]
      }, actorId);

      // 2. Create APPayment
      const apPayment = await tx.aPPayment.create({
        data: {
          organisationId: data.organisationId,
          voucherId: voucher.id,
          supplierId: data.supplierId,
          currencyCode: data.currencyCode,
          amount: new Decimal(data.amount),
          unallocated: new Decimal(data.amount),
        }
      });

      return apPayment;
    });
  }

  static async allocate(data: AllocateAPPaymentInput, actorId: string) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.aPPayment.findUnique({
        where: { id: data.paymentId },
        include: { voucher: true }
      });
      if (!payment) throw new Error("Payment not found");
      
      let totalAllocated = new Decimal(0);

      for (const allocation of data.allocations) {
        const bill = await tx.aPBill.findUnique({
          where: { id: allocation.billId }
        });
        if (!bill) throw new Error(`Bill ${allocation.billId} not found`);
        
        const allocAmount = new Decimal(allocation.amount);
        if (allocAmount.gt(bill.balance)) {
          throw new Error(`Allocation amount exceeds bill balance for ${bill.id}`);
        }

        // Create Allocation Record
        await tx.aPAllocation.create({
          data: {
            billId: bill.id,
            paymentId: payment.id,
            amount: allocAmount,
          }
        });

        // Update Bill Balance
        await tx.aPBill.update({
          where: { id: bill.id },
          data: { balance: { decrement: allocAmount } }
        });

        totalAllocated = totalAllocated.add(allocAmount);
      }

      // Update Payment Unallocated
      if (totalAllocated.gt(payment.unallocated)) {
        throw new Error("Total allocated exceeds payment unallocated amount");
      }

      await tx.aPPayment.update({
        where: { id: payment.id },
        data: { unallocated: { decrement: totalAllocated } }
      });

      return { success: true, allocated: totalAllocated };
    });
  }

  static async getSupplierStatement(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        apBills: {
          include: { voucher: true },
          orderBy: { createdAt: "desc" }
        },
        apPayments: {
          include: { voucher: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!supplier) throw new Error("Supplier not found");

    const transactions = [
      ...supplier.apBills.map(bill => ({
        id: bill.id,
        date: bill.voucher.date,
        type: "BILL",
        number: bill.voucher.number,
        description: bill.voucher.description,
        amount: bill.amount,
        balance: bill.balance,
        status: bill.voucher.status,
      })),
      ...supplier.apPayments.map(pay => ({
        id: pay.id,
        date: pay.voucher.date,
        type: "PAYMENT",
        number: pay.voucher.number,
        description: pay.voucher.description,
        amount: pay.amount.negated(),
        unallocated: pay.unallocated,
        status: pay.voucher.status,
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalBalance = supplier.apBills.reduce((sum, bill) => sum.add(bill.balance), new Decimal(0))
      .sub(supplier.apPayments.reduce((sum, pay) => sum.add(pay.unallocated), new Decimal(0)));

    return {
      supplier,
      transactions,
      totalBalance
    };
  }

  static async postBill(id: string, actorId: string) {
    const apBill = await prisma.aPBill.findUnique({
      where: { id },
      include: { voucher: true }
    });
    if (!apBill) throw new Error("Bill not found");
    return await VoucherService.post(apBill.voucherId, actorId);
  }

  static async postPayment(id: string, actorId: string) {
    const apPayment = await prisma.aPPayment.findUnique({
      where: { id },
      include: { voucher: true }
    });
    if (!apPayment) throw new Error("Payment not found");
    return await VoucherService.post(apPayment.voucherId, actorId);
  }
}
