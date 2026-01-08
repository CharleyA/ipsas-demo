import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ImportType, ImportStatus, VoucherType, AccountType, VoucherStatus, UserRole, Prisma } from '@prisma/client';
import { VoucherService } from '@/lib/services/voucher.service';

const { Decimal } = Prisma;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { jobId } = await params;

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { organisation: true },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.status !== ImportStatus.PREVIEWED) {
      return NextResponse.json({ error: 'Job is not in PREVIEWED status' }, { status: 400 });
    }

    const previewData = job.previewData as any[];
    if (!previewData || previewData.length === 0) {
      return NextResponse.json({ error: 'No data to commit' }, { status: 400 });
    }

    // Update job status to COMMITTING
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportStatus.COMMITTING },
    });

    let processedCount = 0;
    let errorCount = job.errorCount;

    if (job.type === ImportType.STUDENTS) {
      for (const row of previewData) {
        try {
          await prisma.student.upsert({
            where: {
              organisationId_studentNumber: {
                organisationId: job.organisationId,
                studentNumber: String(row.studentNumber),
              },
            },
              update: {
                firstName: row.firstName,
                lastName: row.lastName,
                grade: row.grade ? String(row.grade) : null,
                class: row.class ? String(row.class) : null,
                isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE',
              },
              create: {
                organisationId: job.organisationId,
                studentNumber: String(row.studentNumber),
                firstName: row.firstName,
                lastName: row.lastName,
                grade: row.grade ? String(row.grade) : null,
                class: row.class ? String(row.class) : null,
                isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE' || row.isActive === undefined,
              },
          });
          processedCount++;
        } catch (err: any) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: 0,
              error: `Error importing student ${row.studentNumber}: ${err.message}`,
              rowData: row,
            },
          });
        }
      }
    } else if (job.type === ImportType.SUPPLIERS) {
      for (const row of previewData) {
        try {
          await prisma.supplier.upsert({
            where: {
              organisationId_code: {
                organisationId: job.organisationId,
                code: String(row.code),
              },
            },
            update: {
              name: row.name,
              taxNumber: row.taxNumber ? String(row.taxNumber) : null,
              isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE',
            },
            create: {
              organisationId: job.organisationId,
              code: String(row.code),
              name: row.name,
              taxNumber: row.taxNumber ? String(row.taxNumber) : null,
              isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE' || row.isActive === undefined,
            },
          });
          processedCount++;
        } catch (err: any) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: 0,
              error: `Error importing supplier ${row.code}: ${err.message}`,
              rowData: row,
            },
          });
        }
      }
    } else if (job.type === ImportType.ACCOUNTS) {
      for (const row of previewData) {
        try {
          let parentId = null;
          if (row.parentCode) {
            const parent = await prisma.account.findUnique({
              where: {
                organisationId_code: {
                  organisationId: job.organisationId,
                  code: String(row.parentCode),
                },
              },
            });
            parentId = parent?.id || null;
          }

          await prisma.account.upsert({
            where: {
              organisationId_code: {
                organisationId: job.organisationId,
                code: String(row.code),
              },
            },
            update: {
              name: row.name,
              type: row.type.toUpperCase() as AccountType,
              parentId,
              description: row.description,
            },
            create: {
              organisationId: job.organisationId,
              code: String(row.code),
              name: row.name,
              type: row.type.toUpperCase() as AccountType,
              parentId,
              description: row.description,
            },
          });
          processedCount++;
        } catch (err: any) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: 0,
              error: `Error importing account ${row.code}: ${err.message}`,
              rowData: row,
            },
          });
        }
      }
    } else if (job.type === ImportType.RECEIPTS) {
      const org = await prisma.organisation.findUnique({ where: { id: job.organisationId } });
      const bankAccountId = org?.arBankAccountId;
      const revenueAccountId = org?.arRevenueAccountId;
      const receivableAccountId = org?.arReceivableAccountId;

      if (!bankAccountId || (!revenueAccountId && !receivableAccountId)) {
        throw new Error('AR accounts not configured in Organisation settings.');
      }

      const period = await prisma.fiscalPeriod.findFirst({
        where: { organisationId: job.organisationId, status: 'OPEN' },
        orderBy: [{ year: 'desc' }, { period: 'desc' }],
      });

      if (!period) throw new Error('No open fiscal period found.');

      for (const row of previewData) {
        try {
          const student = await prisma.student.findUnique({
            where: {
              organisationId_studentNumber: {
                organisationId: job.organisationId,
                studentNumber: String(row.studentNumber),
              }
            }
          });

          if (!student) throw new Error(`Student ${row.studentNumber} not found`);

          const amount = parseFloat(row.amount);
          const fxRate = parseFloat(row.fxRate || '1');
          const amountLc = amount * fxRate;

          // If allocating to invoices, we usually credit Accounts Receivable
          const creditAccountId = receivableAccountId || revenueAccountId;

          const voucher = await VoucherService.create({
            organisationId: job.organisationId,
            type: VoucherType.AR_RECEIPT,
            periodId: period.id,
            date: new Date(row.date),
            description: row.description || `Bulk Receipt for ${student.firstName} ${student.lastName}`,
            reference: row.reference,
            lines: [
              {
                lineNumber: 1,
                accountId: bankAccountId!,
                description: 'Debit Bank',
                currencyCode: row.currencyCode,
                amountFc: amount,
                fxRate: fxRate,
                amountLc: amountLc,
                debit: amount,
                credit: null,
              },
              {
                lineNumber: 2,
                accountId: creditAccountId!,
                description: 'Credit Receivable/Revenue',
                currencyCode: row.currencyCode,
                amountFc: amount,
                fxRate: fxRate,
                amountLc: amountLc,
                debit: null,
                credit: amount,
              }
            ]
          }, auth.userId);

          // Create the AR Receipt record
          const arReceipt = await prisma.aRReceipt.create({
            data: {
              organisationId: job.organisationId,
              voucherId: voucher.id,
              studentId: student.id,
              currencyCode: row.currencyCode,
              amount: new Decimal(amount),
              unallocated: new Decimal(amount),
              reference: row.reference,
            }
          });

          // Auto-allocate if requested (simplistic: allocate to oldest invoices first)
          if (row.autoAllocate === 'true' || row.autoAllocate === true) {
             const invoices = await prisma.aRInvoice.findMany({
               where: { studentId: student.id, balance: { gt: 0 }, status: 'POSTED' },
               orderBy: { dueDate: 'asc' }
             });

             let remaining = new Decimal(amount);
             for (const invoice of invoices) {
               if (remaining.lte(0)) break;
               const allocAmount = Decimal.min(remaining, invoice.balance);
               
               await prisma.aRAllocation.create({
                 data: {
                   invoiceId: invoice.id,
                   receiptId: arReceipt.id,
                   amount: allocAmount,
                 }
               });

               await prisma.aRInvoice.update({
                 where: { id: invoice.id },
                 data: { balance: { decrement: allocAmount } }
               });

               remaining = remaining.sub(allocAmount);
             }

             await prisma.aRReceipt.update({
               where: { id: arReceipt.id },
               data: { unallocated: remaining }
             });
          }

          if (row.postImmediately === 'true' || row.postImmediately === true) {
            // Check role for posting
            const userOrg = await prisma.organisationUser.findUnique({
              where: { organisationId_userId: { organisationId: job.organisationId, userId: auth.userId } }
            });
            if (userOrg && ['ADMIN', 'BURSAR', 'HEADMASTER'].includes(userOrg.role)) {
              await VoucherService.submit(voucher.id, auth.userId);
              await VoucherService.approve(voucher.id, auth.userId);
              await VoucherService.post(voucher.id, auth.userId);
            } else {
              await VoucherService.submit(voucher.id, auth.userId);
            }
          }

          processedCount++;
        } catch (err: any) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: 0,
              error: `Error importing receipt for ${row.studentNumber}: ${err.message}`,
              rowData: row,
            },
          });
        }
      }
    } else if (job.type === ImportType.OPENING_BALANCES) {
      // For opening balances, we generate a SINGLE balanced journal voucher
      const period = await prisma.fiscalPeriod.findFirst({
        where: { organisationId: job.organisationId, status: 'OPEN' },
        orderBy: [{ year: 'asc' }, { period: 'asc' }],
      });

      if (!period) throw new Error('No open fiscal period found for opening balances.');

      // Find or create Opening Balance Equity account
      let obeAccount = await prisma.account.findFirst({
        where: { organisationId: job.organisationId, code: 'OBE' }
      });

      if (!obeAccount) {
        obeAccount = await prisma.account.create({
          data: {
            organisationId: job.organisationId,
            code: 'OBE',
            name: 'Opening Balance Equity',
            type: AccountType.NET_ASSETS_EQUITY,
            isSystemAccount: true,
          }
        });
      }

      const lines: any[] = [];
      let totalDebitLc = new Decimal(0);
      let totalCreditLc = new Decimal(0);

      // We need to resolve account codes to IDs first
      const accountMap = new Map<string, string>();
      const accounts = await prisma.account.findMany({ where: { organisationId: job.organisationId } });
      accounts.forEach(a => accountMap.set(a.code, a.id));

      const currencyMap = new Map<string, string>();
      const currencies = await prisma.currency.findMany();
      currencies.forEach(c => currencyMap.set(c.code, c.id));

      const costCentreMap = new Map<string, string>();
      const costCentres = await prisma.costCentre.findMany({ where: { organisationId: job.organisationId } });
      costCentres.forEach(cc => costCentreMap.set(cc.code, cc.id));

      const fundMap = new Map<string, string>();
      const funds = await prisma.fund.findMany({ where: { organisationId: job.organisationId } });
      funds.forEach(f => fundMap.set(f.code, f.id));

      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i];
        const accountId = accountMap.get(String(row.accountCode));
        if (!accountId) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: i + 1,
              error: `Account code ${row.accountCode} not found`,
              rowData: row,
            }
          });
          continue;
        }

        const debitFc = new Decimal(row.debit || 0);
        const creditFc = new Decimal(row.credit || 0);
        const fxRate = new Decimal(row.fxRate || 1);
        const debitLc = debitFc.mul(fxRate);
        const creditLc = creditFc.mul(fxRate);

        totalDebitLc = totalDebitLc.add(debitLc);
        totalCreditLc = totalCreditLc.add(creditLc);

        lines.push({
          lineNumber: lines.length + 1,
          accountId,
          description: row.description || 'Opening Balance',
          currencyCode: row.currencyCode || 'ZWG',
          fxRate,
          amountFc: debitFc.gt(0) ? debitFc : creditFc,
          amountLc: debitLc.gt(0) ? debitLc : creditLc,
          debit: debitFc.gt(0) ? debitFc : null,
          credit: creditFc.gt(0) ? creditFc : null,
          costCentreId: costCentreMap.get(String(row.costCentreCode)) || null,
          fundId: fundMap.get(String(row.fundCode)) || null,
        });
        processedCount++;
      }

      if (lines.length > 0) {
        // Balance it with OBE
        const diffLc = totalDebitLc.sub(totalCreditLc);
        if (!diffLc.isZero()) {
          lines.push({
            lineNumber: lines.length + 1,
            accountId: obeAccount.id,
            description: 'Opening Balance Balancing Entry',
            currencyCode: 'ZWG', // Base currency for balancing
            fxRate: new Decimal(1),
            amountFc: diffLc.abs(),
            amountLc: diffLc.abs(),
            debit: diffLc.lt(0) ? diffLc.abs() : null,
            credit: diffLc.gt(0) ? diffLc.abs() : null,
          });
        }

        await VoucherService.create({
          organisationId: job.organisationId,
          type: VoucherType.JOURNAL,
          periodId: period.id,
          date: new Date(),
          description: 'Opening Balances Import',
          lines: lines.map(l => ({
            ...l,
            amountFc: l.amountFc.toNumber(),
            fxRate: l.fxRate.toNumber(),
            amountLc: l.amountLc.toNumber(),
            debit: l.debit?.toNumber() ?? null,
            credit: l.credit?.toNumber() ?? null,
          }))
        }, auth.userId);
      }
    }

    // Finalize job
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportStatus.COMPLETED,
        processedCount,
        errorCount,
        previewData: null,
      },
    });

    return NextResponse.json({
      success: true,
      processedCount,
      errorCount,
    });

  } catch (error: any) {
    console.error('Import commit error:', error);
    try {
        const { jobId } = await params;
        await prisma.importJob.update({
          where: { id: jobId },
          data: { status: ImportStatus.FAILED },
        });
    } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
