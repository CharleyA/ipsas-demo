import { NextRequest, NextResponse } from 'next/server';
import { generateCSVTemplate, generateXLSXTemplate } from '@/lib/import-utils';

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';

    if (format === 'xlsx') {
      const buffer = await generateXLSXTemplate(type);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=${type}_template.xlsx`,
        },
      });
    } else {
      const csv = generateCSVTemplate(type);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${type}_template.csv`,
        },
      });
    }
  } catch (error: any) {
    console.error('Template Download Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
