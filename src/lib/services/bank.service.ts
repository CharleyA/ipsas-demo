import prisma from "@/lib/db";
import { Decimal, MatchingStatus } from "@prisma/client";
import { AuditService } from "./audit.service";
import { VoucherService } from "./voucher.service";

export interface BankImportRow {
  date: Date;
  description: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export class BankService {
  static async importStatement(bankAccountId: string, filename: string, rows: BankImportRow[], actorId: string) {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });
    if (!bankAccount) throw new Error("Bank account not found");

    return await prisma.$transaction(async (tx) => {
      const bankImport = await tx.bankStatementImport.create({
        data: {
          bankAccountId,
          filename,
        },
      });

      const statementRows = await tx.bankStatementRow.createMany({
        data: rows.map((row) => {
          const amount = (row.credit || 0) - (row.debit || 0);
          return {
            importId: bankImport.id,
            date: row.date,
            description: row.description,
            reference: row.reference,
            debit: row.debit ? new Decimal(row.debit) : null,
            credit: row.credit ? new Decimal(row.credit) : null,
            balance: row.balance ? new Decimal(row.balance) : null,
            amount: new Decimal(amount),
            matchingStatus: "UNMATCHED",
          };
        }),
      });

      await AuditService.log({
        organisationId: bankAccount.organisationId,
        userId: actorId,
        action: "IMPORT_BANK_STATEMENT",
        entityType: "BankStatementImport",
        entityId: bankImport.id,
        newValues: { rowCount: rows.length },
      });

      return bankImport;
    });
  }

  static async getUnmatchedRows(bankAccountId: string) {
    return await prisma.bankStatementRow.findMany({
      where: {
        import: { bankAccountId },
        matchingStatus: "UNMATCHED",
      },
      orderBy: { date: "asc" },
    });
  }

  static async suggestMatches(rowId: string) {
    const row = await prisma.bankStatementRow.findUnique({
      where: { id: rowId },
      include: { import: { include: { bankAccount: true } } },
    });
    if (!row) throw new Error("Row not found");

    const organisationId = row.import.bankAccount.organisationId;
    const bankAccountId = row.import.bankAccount.accountId; // The GL Account ID

    // Find posted vouchers on same date (or nearby) with same amount in the bank account
    // For bank rows, 'amount' is credit - debit.
    // In GL, a bank debit (payment) is a credit to the bank account.
    // A bank credit (receipt) is a debit to the bank account.
    // So if bank row amount is positive (receipt), we look for GL debit of same amount.
    // If bank row amount is negative (payment), we look for GL credit of same amount.

    const vouchers = await prisma.voucher.findMany({
      where: {
        organisationId,
        status: "POSTED",
        date: {
          gte: new Date(row.date.getTime() - 7 * 24 * 60 * 60 * 1000), // Within 7 days
          lte: new Date(row.date.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        lines: {
          some: {
            accountId: bankAccountId,
            OR: [
              { debit: row.amount.abs() },
              { credit: row.amount.abs() },
            ],
          },
        },
      },
      include: {
        lines: {
          where: { accountId: bankAccountId },
        },
      },
    });

    return vouchers.filter(v => {
        const line = v.lines[0];
        if (!line) return false;
        if (row.amount.gt(0)) {
            return line.debit && line.debit.equals(row.amount);
        } else {
            return line.credit && line.credit.equals(row.amount.abs());
        }
    });
  }

  static async matchRow(rowId: string, voucherId: string, actorId: string) {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.bankStatementRow.findUnique({
        where: { id: rowId },
        include: { import: { include: { bankAccount: true } } }
      });
      if (!row) throw new Error("Row not found");
      if (row.matchingStatus === "MATCHED") throw new Error("Row already matched");

      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
      });
      if (!voucher) throw new Error("Voucher not found");

      const updatedRow = await tx.bankStatementRow.update({
        where: { id: rowId },
        data: {
          matchingStatus: "MATCHED",
          matchedVoucherId: voucherId,
        },
      });

      await AuditService.log({
        organisationId: row.import.bankAccount.organisationId,
        userId: actorId,
        action: "MATCH_BANK_ROW",
        entityType: "BankStatementRow",
        entityId: rowId,
        newValues: { voucherId },
      });

      return updatedRow;
    });
  }

  static async getReconciliationSummary(bankAccountId: string) {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { account: true }
    });
    if (!bankAccount) throw new Error("Bank account not found");

    // Get last balance from import
    const lastRow = await prisma.bankStatementRow.findFirst({
        where: { import: { bankAccountId } },
        orderBy: { date: "desc" }
    });

    const bankStatementBalance = lastRow?.balance || new Decimal(0);

    // Get GL Balance
    // Sum of all posted entries for this account
    const glEntries = await prisma.gLEntry.aggregate({
        where: {
            accountId: bankAccount.accountId,
            glHeader: { organisationId: bankAccount.organisationId }
        },
        _sum: {
            debitLc: true,
            creditLc: true
        }
    });

    const glBalance = (glEntries._sum.debitLc || new Decimal(0)).sub(glEntries._sum.creditLc || new Decimal(0));

    // Unpresented Checks (Posted Payments in GL not yet matched in Bank)
    const unmatchedPayments = await prisma.voucher.findMany({
        where: {
            organisationId: bankAccount.organisationId,
            status: "POSTED",
            type: { in: ["PAYMENT", "AP_PAYMENT", "CASHBOOK"] },
            lines: {
                some: {
                    accountId: bankAccount.accountId,
                    credit: { gt: 0 }
                }
            },
            NOT: {
                id: {
                    in: (await prisma.bankStatementRow.findMany({
                        where: { matchingStatus: "MATCHED", matchedVoucherId: { not: null } },
                        select: { matchedVoucherId: true }
                    })).map(r => r.matchedVoucherId!)
                }
            }
        },
        include: { lines: { where: { accountId: bankAccount.accountId } } }
    });

    const totalUnpresented = unmatchedPayments.reduce((sum, v) => sum.add(v.lines[0]?.credit || 0), new Decimal(0));

    // Deposits in Transit (Posted Receipts in GL not yet matched in Bank)
    const unmatchedReceipts = await prisma.voucher.findMany({
        where: {
            organisationId: bankAccount.organisationId,
            status: "POSTED",
            type: { in: ["RECEIPT", "AR_RECEIPT", "CASHBOOK"] },
            lines: {
                some: {
                    accountId: bankAccount.accountId,
                    debit: { gt: 0 }
                }
            },
            NOT: {
                id: {
                    in: (await prisma.bankStatementRow.findMany({
                        where: { matchingStatus: "MATCHED", matchedVoucherId: { not: null } },
                        select: { matchedVoucherId: true }
                    })).map(r => r.matchedVoucherId!)
                }
            }
        },
        include: { lines: { where: { accountId: bankAccount.accountId } } }
    });

    const totalInTransit = unmatchedReceipts.reduce((sum, v) => sum.add(v.lines[0]?.debit || 0), new Decimal(0));

    return {
        bankAccount,
        bankStatementBalance,
        glBalance,
        totalUnpresented,
        totalInTransit,
        adjustedGlBalance: glBalance.sub(totalUnpresented).add(totalInTransit),
        difference: bankStatementBalance.add(totalInTransit).sub(totalUnpresented).sub(glBalance)
    };
  }

  static async createCashbookEntry(data: any, actorId: string) {
    const org = await prisma.organisation.findUnique({
      where: { id: data.organisationId },
    });
    if (!org) throw new Error("Organisation not found");

    const period = await prisma.fiscalPeriod.findFirst({
      where: {
        organisationId: data.organisationId,
        startDate: { lte: new Date(data.date) },
        endDate: { gte: new Date(data.date) },
        status: "OPEN",
      },
    });
    if (!period) throw new Error("No open fiscal period found for the selected date");

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
      include: { account: true }
    });
    if (!bankAccount) throw new Error("Bank account not found");

    return await prisma.$transaction(async (tx) => {
      // Create Voucher
      const voucher = await VoucherService.create({
        organisationId: data.organisationId,
        type: "CASHBOOK",
        periodId: period.id,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference,
        lines: [
          // Bank side
          {
            lineNumber: 1,
            accountId: bankAccount.accountId,
            description: data.description,
            currencyCode: data.currencyCode,
            fxRate: data.fxRate,
            amountFc: data.amount,
            amountLc: data.amount * data.fxRate,
            debit: data.type === "RECEIPT" ? data.amount : undefined,
            credit: data.type === "PAYMENT" ? data.amount : undefined,
            costCentreId: data.costCentreId,
            fundId: data.fundId,
          },
          // Offset side
          {
            lineNumber: 2,
            accountId: data.accountId,
            description: data.description,
            currencyCode: data.currencyCode,
            fxRate: data.fxRate,
            amountFc: data.amount,
            amountLc: data.amount * data.fxRate,
            debit: data.type === "PAYMENT" ? data.amount : undefined,
            credit: data.type === "RECEIPT" ? data.amount : undefined,
            costCentreId: data.costCentreId,
            fundId: data.fundId,
          }
        ]
      }, actorId);

      // Link counterparty if provided
      if (data.studentId || data.supplierId) {
        await tx.voucher.update({
          where: { id: voucher.id },
          data: {
            studentId: data.studentId,
            supplierId: data.supplierId,
          }
        });
      }

      return voucher;
    });
  }
}
