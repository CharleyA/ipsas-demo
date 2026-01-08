import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ImportType, ImportStatus, VoucherType, AccountType } from '@prisma/client';
import { VoucherService } from '@/lib/services/voucher.service';

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
                studentNumber: row.studentNumber,
              },
            },
            update: {
              firstName: row.firstName,
              lastName: row.lastName,
              grade: row.grade,
              isActive: row.isActive === 'true' || row.isActive === true,
            },
            create: {
              organisationId: job.organisationId,
              studentNumber: row.studentNumber,
              firstName: row.firstName,
              lastName: row.lastName,
              grade: row.grade,
              isActive: row.isActive === 'true' || row.isActive === true || row.isActive === undefined,
            },
          });
          processedCount++;
        } catch (err: any) {
          errorCount++;
          await prisma.importJobRowError.create({
            data: {
              jobId: job.id,
              rowNumber: 0, // General error or row-specific? 
              error: `Error importing student ${row.studentNumber}: ${err.message}`,
              rowData: row,
            },
          });
        }
      }
    } else if (job.type === ImportType.ACCOUNTS) {
      for (const row of previewData) {
        try {
          // Find parent if exists
          let parentId = null;
          if (row.parentCode) {
            const parent = await prisma.account.findUnique({
              where: {
                organisationId_code: {
                  organisationId: job.organisationId,
                  code: row.parentCode,
                },
              },
            });
            parentId = parent?.id || null;
          }

          await prisma.account.upsert({
            where: {
              organisationId_code: {
                organisationId: job.organisationId,
                code: row.code,
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
              code: row.code,
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
      // Find default accounts for receipts
      const bankAccount = await prisma.account.findFirst({
        where: { organisationId: job.organisationId, type: AccountType.ASSET, name: { contains: 'Bank', mode: 'insensitive' } },
      }) || await prisma.account.findFirst({
        where: { organisationId: job.organisationId, type: AccountType.ASSET },
      });

      const revenueAccount = await prisma.account.findFirst({
        where: { organisationId: job.organisationId, type: AccountType.REVENUE, name: { contains: 'Fee', mode: 'insensitive' } },
      }) || await prisma.account.findFirst({
        where: { organisationId: job.organisationId, type: AccountType.REVENUE },
      });

      if (!bankAccount || !revenueAccount) {
        throw new Error('Bank or Revenue accounts not found. Please setup Chart of Accounts first.');
      }

      // Find first open period
      const period = await prisma.accountingPeriod.findFirst({
        where: { organisationId: job.organisationId, isClosed: false, isLocked: false },
        orderBy: [{ year: 'desc' }, { period: 'desc' }],
      });

      if (!period) throw new Error('No open accounting period found.');

      for (const row of previewData) {
        try {
          const student = await prisma.student.findUnique({
            where: {
              organisationId_studentNumber: {
                organisationId: job.organisationId,
                studentNumber: row.studentNumber,
              }
            }
          });

          if (!student) throw new Error(`Student ${row.studentNumber} not found`);

          const amount = parseFloat(row.amount);
          const fxRate = parseFloat(row.fxRate || '1');
          const amountLc = amount * fxRate;

          const voucher = await VoucherService.create({
            organisationId: job.organisationId,
            type: VoucherType.RECEIPT,
            periodId: period.id,
            date: new Date(row.date),
            description: row.description || `Receipt for ${student.firstName} ${student.lastName}`,
            reference: row.reference,
            lines: [
              {
                lineNumber: 1,
                accountId: bankAccount.id,
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
                accountId: revenueAccount.id,
                description: 'Credit Revenue',
                currencyCode: row.currencyCode,
                amountFc: amount,
                fxRate: fxRate,
                amountLc: amountLc,
                debit: null,
                credit: amount,
              }
            ]
          }, auth.userId);

          if (row.postImmediately === 'true' || row.postImmediately === true) {
             // If user is BURSAR or ADMIN, they might have permission to post
             // But for now, let's keep it simple as per VoucherService logic
             // which requires APPROVAL before POSTING.
             // We'll just leave it as DRAFT as requested for now, or SUBMITTED.
             await VoucherService.submit(voucher.id, auth.userId);
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
    }

    // Finalize job
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportStatus.COMPLETED,
        processedCount,
        errorCount,
        previewData: null, // Clear preview data after commit
      },
    });

    return NextResponse.json({
      success: true,
      processedCount,
      errorCount,
    });

  } catch (error: any) {
    console.error('Import commit error:', error);
    if (params) {
      const { jobId } = await params;
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: ImportStatus.FAILED },
      }).catch(() => {});
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
