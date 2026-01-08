import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { jobId } = await params;

    const errors = await prisma.importJobRowError.findMany({
      where: { jobId },
      orderBy: { rowNumber: 'asc' },
    });

    if (errors.length === 0) {
      return NextResponse.json({ message: 'No errors found for this job' }, { status: 404 });
    }

    const csvData = errors.map(err => ({
      rowNumber: err.rowNumber,
      error: err.error,
      ...(typeof err.rowData === 'object' ? (err.rowData as any) : { rawData: err.rowData }),
    }));

    const csv = Papa.unparse(csvData);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="import_errors_${jobId}.csv"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
