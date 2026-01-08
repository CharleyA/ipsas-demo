import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseImportFile } from '@/lib/import-utils';
import { ImportType, ImportStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { type } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const rawRows = await parseImportFile(file);
    const importType = type.toUpperCase() as ImportType;

    // Create the import job
    const job = await prisma.importJob.create({
      data: {
        organisationId: auth.organisationId,
        userId: auth.userId,
        type: importType,
        filename: file.name,
        rowCount: rawRows.length,
        status: ImportStatus.PENDING,
      },
    });

    const validatedRows: any[] = [];
    const errors: any[] = [];

    // Validation logic
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 1;
      const rowErrors: string[] = [];

      if (importType === ImportType.STUDENTS) {
        if (!row.studentNumber) rowErrors.push('Student number is required');
        if (!row.firstName) rowErrors.push('First name is required');
        if (!row.lastName) rowErrors.push('Last name is required');
      } else if (importType === ImportType.RECEIPTS) {
        if (!row.studentNumber) rowErrors.push('Student number is required');
        if (!row.amount || isNaN(parseFloat(row.amount))) rowErrors.push('Valid amount is required');
        if (!row.currencyCode) rowErrors.push('Currency code is required');
        if (!row.date) rowErrors.push('Date is required');
      } else if (importType === ImportType.ACCOUNTS) {
        if (!row.code) rowErrors.push('Account code is required');
        if (!row.name) rowErrors.push('Account name is required');
        if (!row.type) rowErrors.push('Account type is required');
        const validTypes = ['ASSET', 'LIABILITY', 'NET_ASSETS_EQUITY', 'REVENUE', 'EXPENSE'];
        if (row.type && !validTypes.includes(row.type.toUpperCase())) {
          rowErrors.push(`Invalid account type: ${row.type}. Must be one of ${validTypes.join(', ')}`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          jobId: job.id,
          rowNumber,
          error: rowErrors.join('; '),
          rowData: row,
        });
      } else {
        validatedRows.push(row);
      }
    }

    // Save errors
    if (errors.length > 0) {
      await prisma.importJobRowError.createMany({
        data: errors,
      });
    }

    // Update job with preview data and error count
    const updatedJob = await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportStatus.PREVIEWED,
        errorCount: errors.length,
        previewData: validatedRows as any,
      },
      include: {
        errors: {
          take: 50, // Only return first 50 errors in preview
        }
      }
    });

    return NextResponse.json({
      jobId: job.id,
      rowCount: rawRows.length,
      errorCount: errors.length,
      previewRows: validatedRows.slice(0, 10), // Preview first 10 valid rows
      errors: updatedJob.errors,
    });

  } catch (error: any) {
    console.error('Import upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
