import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-utils";
import { ReportService } from "@/lib/services/report.service";
import { ReportExporter, ExportFormat, ExportColumn } from "@/lib/report-exporter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    const { searchParams } = new URL(authReq.url);
    const dateStr = searchParams.get("date");
    const format = (searchParams.get("format") || "json") as ExportFormat;
    const date = dateStr ? new Date(dateStr) : new Date();

    const report = await ReportService.getFinancialPosition(authReq.user.organisationId, date);

    if (format === "json") {
      return NextResponse.json(report);
    }

    const columns: ExportColumn[] = [
      { header: "Code", key: "code" },
      { header: "Line Name", key: "name", width: 40 },
      { header: "Amount", key: "amount" },
    ];

    // Flatten recursive rows for export
    const flattenRows = (rows: any[], level = 0): any[] => {
      const result: any[] = [];
      rows.forEach((row) => {
        result.push({
          code: row.code,
          name: "  ".repeat(level) + row.name,
          amount: row.amount,
        });
        if (row.children && row.children.length > 0) {
          result.push(...flattenRows(row.children, level + 1));
        }
      });
      return result;
    };

    const data = flattenRows(report.rows);

    const content = await ReportExporter.export(format, data, columns, "Financial Position");
    return ReportExporter.getResponse(format, content, "Financial Position");
  });
}
